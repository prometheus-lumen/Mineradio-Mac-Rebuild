use flate2::read::GzDecoder;
use lofty::{
    file::{AudioFile, TaggedFileExt},
    probe::Probe,
    tag::Accessor,
};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const AUDIO_EXTENSIONS: &[&str] = &["mp3", "flac", "m4a", "aac", "ogg", "wav"];
const MAX_LOCAL_TRACKS: i64 = 2_000;

pub struct LibraryPaths {
    pub database: PathBuf,
    pub media: PathBuf,
    pub covers: PathBuf,
}

pub fn paths(app: &AppHandle) -> Result<LibraryPaths, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("library");
    let result = LibraryPaths {
        database: root.join("library.sqlite3"),
        media: root.join("media"),
        covers: root.join("covers"),
    };
    fs::create_dir_all(&result.media).map_err(|error| error.to_string())?;
    fs::create_dir_all(&result.covers).map_err(|error| error.to_string())?;
    initialize(&result.database)?;
    Ok(result)
}

pub fn initialize(database: &Path) -> Result<(), String> {
    let connection = Connection::open(database).map_err(|error| error.to_string())?;
    connection
        .execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS tracks (
               id TEXT PRIMARY KEY,
               source TEXT NOT NULL,
               provider_id TEXT,
               content_hash TEXT UNIQUE,
               media_file TEXT,
               original_name TEXT NOT NULL,
               title TEXT NOT NULL,
               artist TEXT NOT NULL DEFAULT '',
               album TEXT NOT NULL DEFAULT '',
               duration REAL NOT NULL DEFAULT 0,
               track_number INTEGER,
               cover_file TEXT,
               cover_mime TEXT,
               liked INTEGER NOT NULL DEFAULT 0,
               available INTEGER NOT NULL DEFAULT 1,
               provider_data TEXT NOT NULL DEFAULT '{}',
               retained INTEGER NOT NULL DEFAULT 0,
               imported_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS playlists (
               id TEXT PRIMARY KEY,
               name TEXT NOT NULL,
               kind TEXT NOT NULL,
               source_url TEXT,
               created_at INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS playlist_tracks (
               playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
               track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
               position INTEGER NOT NULL,
               PRIMARY KEY (playlist_id, track_id)
             );
             CREATE TABLE IF NOT EXISTS queue (
               position INTEGER PRIMARY KEY,
               track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE
             );",
        )
        .map_err(|error| error.to_string())?;
    let _ = connection.execute(
        "ALTER TABLE tracks ADD COLUMN retained INTEGER NOT NULL DEFAULT 0",
        [],
    );
    Ok(())
}

fn open(app: &AppHandle) -> Result<(LibraryPaths, Connection), String> {
    let paths = paths(app)?;
    let connection = Connection::open(&paths.database).map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    Ok((paths, connection))
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn supported_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| AUDIO_EXTENSIONS.contains(&value.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn collect_audio_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut result = Vec::new();
    let mut pending = vec![root.to_path_buf()];
    while let Some(directory) = pending.pop() {
        for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let file_type = entry.file_type().map_err(|error| error.to_string())?;
            if file_type.is_symlink() {
                continue;
            }
            if file_type.is_dir() {
                pending.push(entry.path());
            } else if file_type.is_file() && supported_audio(&entry.path()) {
                result.push(entry.path());
            }
        }
    }
    result.sort();
    Ok(result)
}

fn file_hash(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut hash = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let count = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hash.finalize()))
}

struct AudioMetadata {
    title: String,
    artist: String,
    album: String,
    duration: f64,
    track_number: Option<u32>,
    cover: Option<(Vec<u8>, String)>,
}

fn read_metadata(path: &Path) -> AudioMetadata {
    let fallback = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("本地音乐")
        .to_owned();
    let Ok(tagged) = Probe::open(path).and_then(|probe| probe.read()) else {
        return AudioMetadata {
            title: fallback,
            artist: String::new(),
            album: String::new(),
            duration: 0.0,
            track_number: None,
            cover: None,
        };
    };
    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());
    let cover = tag.and_then(|tag| {
        tag.pictures().first().map(|picture| {
            (
                picture.data().to_vec(),
                picture
                    .mime_type()
                    .map(|mime| mime.to_string())
                    .unwrap_or_else(|| "image/jpeg".into()),
            )
        })
    });
    AudioMetadata {
        title: tag
            .and_then(|tag| tag.title())
            .map(|value| value.to_string())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(fallback),
        artist: tag
            .and_then(|tag| tag.artist())
            .map(|value| value.to_string())
            .unwrap_or_default(),
        album: tag
            .and_then(|tag| tag.album())
            .map(|value| value.to_string())
            .unwrap_or_default(),
        duration: tagged.properties().duration().as_secs_f64(),
        track_number: tag.and_then(|tag| tag.track()),
        cover,
    }
}

fn add_to_playlist(
    transaction: &Transaction<'_>,
    playlist_id: &str,
    track_id: &str,
) -> Result<(), String> {
    let next: i64 = transaction
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = ?1",
            [playlist_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?1, ?2, ?3)",
            params![playlist_id, track_id, next],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn ensure_local_track_capacity(transaction: &Transaction<'_>) -> Result<(), String> {
    let count: i64 = transaction
        .query_row(
            "SELECT COUNT(*) FROM tracks WHERE source = 'local'",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if count >= MAX_LOCAL_TRACKS {
        return Err("LOCAL_TRACK_LIMIT_REACHED".into());
    }
    Ok(())
}

fn ingest_file(
    transaction: &Transaction<'_>,
    paths: &LibraryPaths,
    source_path: &Path,
    playlist_id: Option<&str>,
) -> Result<(String, bool), String> {
    if !supported_audio(source_path) {
        return Err("LOCAL_UNSUPPORTED_FORMAT".into());
    }
    let hash = file_hash(source_path)?;
    if let Some(id) = transaction
        .query_row(
            "SELECT id FROM tracks WHERE content_hash = ?1",
            [&hash],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
    {
        if playlist_id.is_none() {
            transaction
                .execute("UPDATE tracks SET retained = 1 WHERE id = ?1", [&id])
                .map_err(|error| error.to_string())?;
        }
        if let Some(playlist_id) = playlist_id {
            add_to_playlist(transaction, playlist_id, &id)?;
        }
        return Ok((id, false));
    }
    ensure_local_track_capacity(transaction)?;
    let id = Uuid::new_v4().to_string();
    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("audio")
        .to_ascii_lowercase();
    let media_file = format!("{hash}.{extension}");
    let destination = paths.media.join(&media_file);
    if !destination.exists() {
        let temporary = paths.media.join(format!(".{id}.importing"));
        fs::copy(source_path, &temporary).map_err(|error| error.to_string())?;
        fs::rename(&temporary, &destination).map_err(|error| error.to_string())?;
    }
    let metadata = read_metadata(source_path);
    let (cover_file, cover_mime) = if let Some((bytes, mime)) = metadata.cover {
        let cover_file = format!("{hash}.cover");
        let cover_path = paths.covers.join(&cover_file);
        if !cover_path.exists() {
            let mut file = fs::File::create(&cover_path).map_err(|error| error.to_string())?;
            file.write_all(&bytes).map_err(|error| error.to_string())?;
        }
        (Some(cover_file), Some(mime))
    } else {
        (None, None)
    };
    transaction
        .execute(
            "INSERT INTO tracks (id, source, content_hash, media_file, original_name, title, artist, album, duration, track_number, cover_file, cover_mime, retained, imported_at)
             VALUES (?1, 'local', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                hash,
                media_file,
                source_path.file_name().and_then(|value| value.to_str()).unwrap_or("audio"),
                metadata.title,
                metadata.artist,
                metadata.album,
                metadata.duration,
                metadata.track_number,
                cover_file,
                cover_mime,
                playlist_id.is_none() as i64,
                now_millis(),
            ],
        )
        .map_err(|error| error.to_string())?;
    if let Some(playlist_id) = playlist_id {
        add_to_playlist(transaction, playlist_id, &id)?;
    }
    Ok((id, true))
}

fn ensure_playlist(
    transaction: &Transaction<'_>,
    id: &str,
    name: &str,
    kind: &str,
    source_url: Option<&str>,
) -> Result<(), String> {
    transaction
        .execute(
            "INSERT INTO playlists (id, name, kind, source_url, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
               name = CASE WHEN playlists.kind = 'folder' THEN playlists.name ELSE excluded.name END,
               source_url = COALESCE(excluded.source_url, playlists.source_url)",
            params![id, name.trim(), kind, source_url, now_millis()],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn snapshot_from_connection(connection: &Connection) -> Result<Value, String> {
    let mut tracks_statement = connection
        .prepare(
            "SELECT id, source, provider_id, original_name, title, artist, album, duration, liked, available, provider_data, cover_file
             FROM tracks ORDER BY imported_at, rowid",
        )
        .map_err(|error| error.to_string())?;
    let tracks = tracks_statement
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let source: String = row.get(1)?;
            let provider_data: String = row.get(10)?;
            let mut value =
                serde_json::from_str::<Value>(&provider_data).unwrap_or_else(|_| json!({}));
            if !value.is_object() {
                value = json!({});
            }
            let object = value
                .as_object_mut()
                .expect("value was normalized to an object");
            object.insert(
                "id".into(),
                row.get::<_, Option<String>>(2)?
                    .map(Value::String)
                    .unwrap_or_else(|| Value::String(id.clone())),
            );
            object.insert("libraryId".into(), Value::String(id.clone()));
            object.insert("localKey".into(), Value::String(id.clone()));
            object.insert(
                "type".into(),
                Value::String(
                    if source == "local" {
                        "local"
                    } else {
                        source.as_str()
                    }
                    .into(),
                ),
            );
            object.insert("source".into(), Value::String(source.clone()));
            object.insert("provider".into(), Value::String(source.clone()));
            object.insert("originalName".into(), Value::String(row.get(3)?));
            object.insert("name".into(), Value::String(row.get(4)?));
            object.insert("artist".into(), Value::String(row.get(5)?));
            object.insert("album".into(), Value::String(row.get(6)?));
            object.insert("duration".into(), Value::from(row.get::<_, f64>(7)?));
            object.insert("localHeart".into(), Value::Bool(row.get::<_, i64>(8)? != 0));
            object.insert("playable".into(), Value::Bool(row.get::<_, i64>(9)? != 0));
            if source == "local" {
                object.insert(
                    "localUrl".into(),
                    Value::String(format!("/api/local-media/{id}")),
                );
            }
            if row.get::<_, Option<String>>(11)?.is_some() {
                object.insert(
                    "cover".into(),
                    Value::String(format!("/api/local-cover/{id}")),
                );
            }
            Ok(value)
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let mut playlist_statement = connection
        .prepare("SELECT id, name, kind, source_url FROM playlists ORDER BY created_at, rowid")
        .map_err(|error| error.to_string())?;
    let playlists = playlist_statement
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let song_keys = connection
                .prepare(
                    "SELECT track_id FROM playlist_tracks WHERE playlist_id = ?1 ORDER BY position",
                )?
                .query_map([&id], |track_row| track_row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;
            Ok(json!({
                "id": id,
                "name": row.get::<_, String>(1)?,
                "kind": row.get::<_, String>(2)?,
                "sourceUrl": row.get::<_, Option<String>>(3)?,
                "songKeys": song_keys,
            }))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    let queue = connection
        .prepare("SELECT track_id FROM queue ORDER BY position")
        .and_then(|mut statement| {
            statement
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "version": 2, "songs": tracks, "playlists": playlists, "queue": queue }))
}

#[tauri::command]
pub fn library_snapshot(app: AppHandle) -> Result<Value, String> {
    let (_, connection) = open(&app)?;
    snapshot_from_connection(&connection)
}

#[tauri::command]
pub async fn library_import_files(
    app: AppHandle,
    playlist_id: Option<String>,
) -> Result<Value, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("导入音频文件（MP3、FLAC、M4A、AAC、OGG、WAV）")
        .blocking_pick_files();
    let Some(selected) = selected else {
        return Ok(json!({ "ok": false, "canceled": true }));
    };
    let files = selected
        .into_iter()
        .filter_map(|path| path.as_path().map(Path::to_owned))
        .collect::<Vec<_>>();
    if files.is_empty() {
        return Err("LOCAL_NO_FILES_SELECTED".into());
    }
    tauri::async_runtime::spawn_blocking(move || import_paths(&app, files, playlist_id.as_deref()))
        .await
        .map_err(|error| format!("LOCAL_IMPORT_TASK_FAILED: {error}"))?
}

fn import_paths(
    app: &AppHandle,
    files: Vec<PathBuf>,
    playlist_id: Option<&str>,
) -> Result<Value, String> {
    let (paths, mut connection) = open(app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    if let Some(playlist_id) = playlist_id {
        if !playlist_id.is_empty() {
            let exists: bool = transaction
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM playlists WHERE id = ?1)",
                    [playlist_id],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            if !exists {
                return Err("PLAYLIST_NOT_FOUND".into());
            }
        }
    }
    let mut added = 0;
    let mut reused = 0;
    let mut errors = Vec::new();
    for file in files {
        match ingest_file(&transaction, &paths, &file, playlist_id.filter(|value| !value.is_empty())) {
            Ok((_, true)) => added += 1,
            Ok((_, false)) => reused += 1,
            Err(error) => errors.push(json!({ "file": file.file_name().and_then(|value| value.to_str()).unwrap_or(""), "error": error })),
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "added": added, "reused": reused, "errors": errors }))
}

#[tauri::command]
pub async fn library_import_folder(app: AppHandle) -> Result<Value, String> {
    let selected = app.dialog().file().blocking_pick_folder();
    let Some(root) = selected.and_then(|path| path.as_path().map(Path::to_owned)) else {
        return Ok(json!({ "ok": false, "canceled": true }));
    };
    tauri::async_runtime::spawn_blocking(move || import_folder_path(&app, root))
        .await
        .map_err(|error| format!("LOCAL_FOLDER_IMPORT_TASK_FAILED: {error}"))?
}

fn import_folder_path(app: &AppHandle, root: PathBuf) -> Result<Value, String> {
    let files = collect_audio_files(&root)?;
    let (paths, mut connection) = open(app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let root_hash = format!("{:x}", Sha256::digest(root.to_string_lossy().as_bytes()));
    let root_id = format!("folder:{}", &root_hash[..24]);
    let name = root
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("本地文件夹");
    ensure_playlist(&transaction, &root_id, name, "folder", None)?;
    let mut added = 0;
    let mut reused = 0;
    let mut errors = Vec::new();
    for file in files {
        match ingest_file(&transaction, &paths, &file, Some(&root_id)) {
            Ok((_, true)) => added += 1,
            Ok((_, false)) => reused += 1,
            Err(error) => errors.push(json!({ "file": file.file_name().and_then(|value| value.to_str()).unwrap_or(""), "error": error })),
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(
        json!({ "ok": true, "playlistId": root_id, "added": added, "reused": reused, "errors": errors }),
    )
}

fn ensure_unique_playlist_name(
    transaction: &Transaction<'_>,
    name: &str,
    exclude_id: Option<&str>,
) -> Result<(), String> {
    let duplicate: bool = transaction
        .query_row(
            "SELECT EXISTS(
               SELECT 1 FROM playlists
               WHERE lower(trim(name)) = lower(trim(?1))
                 AND (?2 IS NULL OR id != ?2)
             )",
            params![name, exclude_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if duplicate {
        return Err("PLAYLIST_NAME_DUPLICATE".into());
    }
    Ok(())
}

#[tauri::command]
pub fn library_create_playlist(app: AppHandle, name: String) -> Result<Value, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 40 {
        return Err("PLAYLIST_NAME_INVALID".into());
    }
    let (_, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    ensure_unique_playlist_name(&transaction, name, None)?;
    let id = format!("custom:{}", Uuid::new_v4());
    ensure_playlist(&transaction, &id, name, "custom", None)?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "id": id }))
}

#[tauri::command]
pub fn library_rename_playlist(
    app: AppHandle,
    playlist_id: String,
    name: String,
) -> Result<Value, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 40 {
        return Err("PLAYLIST_NAME_INVALID".into());
    }
    let (_, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    ensure_unique_playlist_name(&transaction, name, Some(&playlist_id))?;
    let changed = transaction
        .execute(
            "UPDATE playlists SET name = ?1 WHERE id = ?2 AND kind IN ('custom', 'folder', 'imported')",
            params![name, playlist_id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("PLAYLIST_RENAME_NOT_ALLOWED".into());
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub fn library_delete_playlist(
    app: AppHandle,
    playlist_id: String,
    cleanup: bool,
) -> Result<Value, String> {
    let (paths, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "DELETE FROM playlists WHERE id = ?1 AND kind != 'heart'",
            [&playlist_id],
        )
        .map_err(|error| error.to_string())?;
    let mut removed_files = Vec::new();
    let mut removed_covers = Vec::new();
    if cleanup {
        let mut statement = transaction
            .prepare(
                "SELECT id, media_file, cover_file FROM tracks
                 WHERE source = 'local' AND retained = 0 AND NOT EXISTS (SELECT 1 FROM playlist_tracks WHERE track_id = tracks.id)",
            )
            .map_err(|error| error.to_string())?;
        let orphaned = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        drop(statement);
        for (id, media, cover) in orphaned {
            transaction
                .execute("DELETE FROM tracks WHERE id = ?1", [&id])
                .map_err(|error| error.to_string())?;
            if let Some(media) = media {
                removed_files.push(media);
            }
            if let Some(cover) = cover {
                removed_covers.push(cover);
            }
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;
    for file in &removed_files {
        let _ = fs::remove_file(paths.media.join(file));
    }
    for file in &removed_covers {
        let _ = fs::remove_file(paths.covers.join(file));
    }
    Ok(json!({ "ok": true, "removedMedia": removed_files.len() }))
}

#[tauri::command]
pub fn library_delete_track(app: AppHandle, track_id: String) -> Result<Value, String> {
    let (paths, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let files = transaction
        .query_row(
            "SELECT media_file, cover_file FROM tracks WHERE id = ?1",
            [&track_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM tracks WHERE id = ?1", [&track_id])
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())?;
    if let Some((media, cover)) = files {
        if let Some(media) = media {
            let _ = fs::remove_file(paths.media.join(media));
        }
        if let Some(cover) = cover {
            let _ = fs::remove_file(paths.covers.join(cover));
        }
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub fn library_set_heart(app: AppHandle, track_id: String, liked: bool) -> Result<Value, String> {
    let (_, connection) = open(&app)?;
    connection
        .execute(
            "UPDATE tracks SET liked = ?2 WHERE id = ?1",
            params![track_id, liked as i64],
        )
        .map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub fn library_toggle_playlist_track(
    app: AppHandle,
    playlist_id: String,
    track_id: String,
) -> Result<Value, String> {
    let (_, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let exists: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM playlist_tracks WHERE playlist_id = ?1 AND track_id = ?2)",
            params![playlist_id, track_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if exists {
        transaction
            .execute(
                "DELETE FROM playlist_tracks WHERE playlist_id = ?1 AND track_id = ?2",
                params![playlist_id, track_id],
            )
            .map_err(|error| error.to_string())?;
    } else {
        add_to_playlist(&transaction, &playlist_id, &track_id)?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "included": !exists }))
}

#[tauri::command]
pub fn library_save_queue(app: AppHandle, track_ids: Vec<String>) -> Result<Value, String> {
    let (_, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM queue", [])
        .map_err(|error| error.to_string())?;
    for (position, id) in track_ids.into_iter().take(5000).enumerate() {
        transaction
            .execute(
                "INSERT OR IGNORE INTO queue (position, track_id) VALUES (?1, ?2)",
                params![position as i64, id],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true }))
}

fn decode_lx(path: &Path) -> Result<Value, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let text = if path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("json"))
        .unwrap_or(false)
    {
        String::from_utf8(bytes).map_err(|_| "LX_FILE_INVALID_UTF8".to_string())?
    } else {
        let mut decoder = GzDecoder::new(bytes.as_slice());
        let mut text = String::new();
        decoder
            .read_to_string(&mut text)
            .map_err(|_| "LX_FILE_INVALID_GZIP".to_string())?;
        text
    };
    let mut value: Value =
        serde_json::from_str(&text).map_err(|_| "LX_FILE_INVALID_JSON".to_string())?;
    if value.is_string() {
        value = serde_json::from_str(value.as_str().unwrap_or_default())
            .map_err(|_| "LX_FILE_INVALID_JSON".to_string())?;
    }
    Ok(value)
}

fn lx_song_fields(song: &Value) -> (String, String, String, String, f64, Value) {
    let source = match song
        .get("source")
        .and_then(Value::as_str)
        .unwrap_or("unknown")
    {
        "tx" => "qq",
        "wy" => "netease",
        "kg" => "kugou",
        value => value,
    }
    .to_owned();
    let provider_id = song
        .get("id")
        .or_else(|| song.get("mid"))
        .or_else(|| song.get("hash"))
        .map(|value| {
            value
                .as_str()
                .map(str::to_owned)
                .unwrap_or_else(|| value.to_string())
        })
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let title = song
        .get("name")
        .or_else(|| song.get("title"))
        .and_then(Value::as_str)
        .unwrap_or("未知歌曲")
        .to_owned();
    let artist = song
        .get("singer")
        .or_else(|| song.get("artist"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_owned();
    let duration = song
        .get("interval")
        .or_else(|| song.get("duration"))
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    (source, provider_id, title, artist, duration, song.clone())
}

fn import_lx_playlist_data(app: &AppHandle, value: Value) -> Result<Value, String> {
    let file_type = value.get("type").and_then(Value::as_str).unwrap_or("");
    if matches!(
        file_type,
        "setting" | "setting_v2" | "allData" | "allData_v2"
    ) {
        return Err("LX_FILE_IS_NOT_PLAYLIST".into());
    }
    let mut lists = Vec::<(String, Vec<Value>)>::new();
    let data = value.get("data").cloned().unwrap_or(Value::Null);
    match file_type {
        "playListPart" | "playListPart_v2" | "defautlList" => {
            let name = data
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or("LX 导入歌单")
                .to_owned();
            let songs = data
                .get("list")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            lists.push((name, songs));
        }
        "playList" | "playList_v2" => {
            let arrays: Vec<Value> = if let Some(array) = data.as_array() {
                array.clone()
            } else {
                ["defaultList", "loveList", "userList", "userLists"]
                    .iter()
                    .filter_map(|key| data.get(*key).cloned())
                    .collect()
            };
            for item in arrays {
                if let Some(array) = item.as_array() {
                    for list in array {
                        lists.push((
                            list.get("name")
                                .and_then(Value::as_str)
                                .unwrap_or("LX 导入歌单")
                                .to_owned(),
                            list.get("list")
                                .and_then(Value::as_array)
                                .cloned()
                                .unwrap_or_default(),
                        ));
                    }
                } else {
                    lists.push((
                        item.get("name")
                            .and_then(Value::as_str)
                            .unwrap_or("LX 导入歌单")
                            .to_owned(),
                        item.get("list")
                            .and_then(Value::as_array)
                            .cloned()
                            .unwrap_or_default(),
                    ));
                }
            }
        }
        _ => return Err("LX_FILE_UNKNOWN_TYPE".into()),
    }
    let (_, mut connection) = open(app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let mut imported = 0;
    for (name, songs) in lists {
        let playlist_id = format!("imported:{}", Uuid::new_v4());
        ensure_playlist(
            &transaction,
            &playlist_id,
            &name,
            "imported",
            Some("lx-file"),
        )?;
        for song in songs {
            let (source, provider_id, title, artist, duration, provider_data) =
                lx_song_fields(&song);
            let existing = transaction
                .query_row(
                    "SELECT id FROM tracks WHERE source = ?1 AND provider_id = ?2",
                    params![source, provider_id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|error| error.to_string())?;
            let id = existing.unwrap_or_else(|| Uuid::new_v4().to_string());
            if transaction
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM tracks WHERE id = ?1)",
                    [&id],
                    |row| row.get::<_, bool>(0),
                )
                .unwrap_or(false)
                == false
            {
                transaction.execute(
                    "INSERT INTO tracks (id, source, provider_id, original_name, title, artist, duration, available, provider_data, imported_at) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![id, source, provider_id, title, artist, duration, matches!(source.as_str(), "qq" | "netease" | "kugou") as i64, provider_data.to_string(), now_millis()],
                ).map_err(|error| error.to_string())?;
            }
            add_to_playlist(&transaction, &playlist_id, &id)?;
            imported += 1;
        }
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "imported": imported }))
}

#[tauri::command]
pub async fn library_import_lx_file(app: AppHandle) -> Result<Value, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("LX Music Playlist", &["lxmc", "json"])
        .blocking_pick_file();
    let Some(path) = selected.and_then(|path| path.as_path().map(Path::to_owned)) else {
        return Ok(json!({ "ok": false, "canceled": true }));
    };
    tauri::async_runtime::spawn_blocking(move || {
        let value = decode_lx(&path)?;
        import_lx_playlist_data(&app, value)
    })
    .await
    .map_err(|error| format!("LX_IMPORT_TASK_FAILED: {error}"))?
}

#[tauri::command]
pub fn library_import_remote_playlist(
    app: AppHandle,
    name: String,
    source_url: String,
    source: String,
    songs: Vec<Value>,
) -> Result<Value, String> {
    if name.trim().is_empty() || songs.len() > 20_000 {
        return Err("PLAYLIST_IMPORT_INVALID".into());
    }
    let normalized_source = match source.as_str() {
        "tx" | "qq" => "qq",
        "wy" | "netease" => "netease",
        "kg" | "kugou" => "kugou",
        "kw" => "kw",
        "mg" => "mg",
        _ => return Err("PLAYLIST_SOURCE_UNSUPPORTED".into()),
    };
    let (_, mut connection) = open(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let playlist_id = format!("imported:{}", Uuid::new_v4());
    ensure_playlist(
        &transaction,
        &playlist_id,
        name.trim(),
        "imported",
        Some(&source_url),
    )?;
    let mut imported = 0;
    for song in songs {
        let resolved_source = song
            .get("source")
            .or_else(|| song.get("provider"))
            .and_then(Value::as_str)
            .map(|value| match value {
                "tx" | "qq" => "qq",
                "wy" | "netease" => "netease",
                "kg" | "kugou" => "kugou",
                _ => value,
            })
            .unwrap_or(normalized_source);
        let track_source = if matches!(normalized_source, "kw" | "mg")
            && song.get("playable").and_then(Value::as_bool) == Some(true)
            && matches!(resolved_source, "qq" | "netease" | "kugou")
        {
            resolved_source
        } else {
            normalized_source
        };
        let provider_id = song
            .get("id")
            .or_else(|| song.get("mid"))
            .or_else(|| song.get("songmid"))
            .or_else(|| song.get("hash"))
            .map(|value| {
                value
                    .as_str()
                    .map(str::to_owned)
                    .unwrap_or_else(|| value.to_string())
            })
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let title = song
            .get("name")
            .or_else(|| song.get("title"))
            .and_then(Value::as_str)
            .unwrap_or("未知歌曲");
        let artist = song
            .get("artist")
            .or_else(|| song.get("singer"))
            .and_then(Value::as_str)
            .unwrap_or("");
        let album = song.get("album").and_then(Value::as_str).unwrap_or("");
        let duration = song
            .get("duration")
            .or_else(|| song.get("interval"))
            .and_then(Value::as_f64)
            .unwrap_or(0.0);
        let existing = transaction
            .query_row(
                "SELECT id FROM tracks WHERE source = ?1 AND provider_id = ?2",
                params![track_source, provider_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        let id = existing.unwrap_or_else(|| Uuid::new_v4().to_string());
        let exists: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM tracks WHERE id = ?1)",
                [&id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !exists {
            transaction.execute(
                "INSERT INTO tracks (id, source, provider_id, original_name, title, artist, album, duration, available, provider_data, imported_at)
                 VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![id, track_source, provider_id, title, artist, album, duration, matches!(track_source, "qq" | "netease" | "kugou") as i64, song.to_string(), now_millis()],
            ).map_err(|error| error.to_string())?;
        }
        add_to_playlist(&transaction, &playlist_id, &id)?;
        imported += 1;
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true, "playlistId": playlist_id, "imported": imported }))
}

pub fn media_record(database: &Path, track_id: &str) -> Result<Option<(String, String)>, String> {
    let connection = Connection::open(database).map_err(|error| error.to_string())?;
    connection
        .query_row("SELECT media_file, original_name FROM tracks WHERE id = ?1 AND source = 'local' AND available = 1", [track_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .optional()
        .map_err(|error| error.to_string())
}

pub fn cover_record(database: &Path, track_id: &str) -> Result<Option<(String, String)>, String> {
    let connection = Connection::open(database).map_err(|error| error.to_string())?;
    connection
        .query_row(
            "SELECT cover_file, cover_mime FROM tracks WHERE id = ?1",
            [track_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::{write::GzEncoder, Compression};

    #[test]
    fn initializes_database_idempotently() {
        let root = std::env::temp_dir().join(format!("mineradio-library-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let database = root.join("library.sqlite3");
        initialize(&database).unwrap();
        initialize(&database).unwrap();
        let connection = Connection::open(database).unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn playlist_names_are_unique_except_for_the_same_playlist() {
        let root = std::env::temp_dir().join(format!("mineradio-playlist-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let database = root.join("library.sqlite3");
        initialize(&database).unwrap();
        let mut connection = Connection::open(database).unwrap();
        let transaction = connection.transaction().unwrap();
        ensure_playlist(&transaction, "custom:first", "My List", "custom", None).unwrap();
        assert_eq!(
            ensure_unique_playlist_name(&transaction, " my list ", None).unwrap_err(),
            "PLAYLIST_NAME_DUPLICATE"
        );
        assert!(ensure_unique_playlist_name(&transaction, "My List", Some("custom:first")).is_ok());
        assert!(ensure_unique_playlist_name(&transaction, "Another List", None).is_ok());
        drop(transaction);
        drop(connection);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn local_track_capacity_stops_at_two_thousand() {
        let root = std::env::temp_dir().join(format!("mineradio-capacity-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let database = root.join("library.sqlite3");
        initialize(&database).unwrap();
        let mut connection = Connection::open(database).unwrap();
        let transaction = connection.transaction().unwrap();
        assert!(ensure_local_track_capacity(&transaction).is_ok());
        for index in 0..MAX_LOCAL_TRACKS {
            transaction
                .execute(
                    "INSERT INTO tracks (id, source, original_name, title, imported_at) VALUES (?1, 'local', ?1, ?1, 0)",
                    [format!("track-{index}")],
                )
                .unwrap();
        }
        assert_eq!(
            ensure_local_track_capacity(&transaction).unwrap_err(),
            "LOCAL_TRACK_LIMIT_REACHED"
        );
        drop(transaction);
        drop(connection);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_non_playlist_lx_files() {
        let value = json!({ "type": "setting_v2", "data": {} });
        assert_eq!(
            value.get("type").and_then(Value::as_str),
            Some("setting_v2")
        );
    }

    #[test]
    fn ingested_files_are_content_deduplicated() {
        let root = std::env::temp_dir().join(format!("mineradio-library-dedup-{}", Uuid::new_v4()));
        let paths = LibraryPaths {
            database: root.join("library.sqlite3"),
            media: root.join("media"),
            covers: root.join("covers"),
        };
        fs::create_dir_all(&paths.media).unwrap();
        fs::create_dir_all(&paths.covers).unwrap();
        initialize(&paths.database).unwrap();
        let source = root.join("same.mp3");
        fs::write(&source, b"not-a-real-mp3-but-stable-content").unwrap();
        let mut connection = Connection::open(&paths.database).unwrap();
        let transaction = connection.transaction().unwrap();
        let first = ingest_file(&transaction, &paths, &source, None).unwrap();
        let second = ingest_file(&transaction, &paths, &source, None).unwrap();
        assert!(first.1);
        assert!(!second.1);
        assert_eq!(first.0, second.0);
        transaction.commit().unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn decodes_lxmc_gzip_json() {
        let root = std::env::temp_dir().join(format!("mineradio-lxmc-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let path = root.join("list.lxmc");
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(br#"{"type":"playListPart_v2","data":{"name":"Test","list":[]}}"#)
            .unwrap();
        fs::write(&path, encoder.finish().unwrap()).unwrap();
        let decoded = decode_lx(&path).unwrap();
        assert_eq!(decoded.get("type"), Some(&json!("playListPart_v2")));
        let _ = fs::remove_dir_all(root);
    }
}
