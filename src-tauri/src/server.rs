use axum::{
    body::Body,
    extract::{Path as AxumPath, Query, Request, State},
    http::{header, HeaderMap, HeaderValue, Response, StatusCode},
    response::IntoResponse,
    routing::{any, get},
    Json, Router,
};
use base64::Engine;
use futures_util::TryStreamExt;
use ncmapi2::{NcmApi, ResourceType};
use netease_qq_music_api::{
    client::LoginSession,
    models::{LoginStatus, LoginToken, Platform, Song, SongQuality, TencentLoginToken},
    MusicClient,
};
use percent_encoding::{percent_decode_str, utf8_percent_encode, NON_ALPHANUMERIC};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    path::{Component, Path, PathBuf},
    sync::Arc,
};
use tokio::sync::RwLock;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

pub struct ServerPaths {
    pub public: PathBuf,
    pub cookie: PathBuf,
    pub qq_cookie: PathBuf,
    pub kugou_cookie: PathBuf,
    pub beat_cache: PathBuf,
    pub updates: PathBuf,
}

struct ApiState {
    client: &'static MusicClient,
    http: reqwest::Client,
    public: PathBuf,
    cookie: PathBuf,
    qq_cookie: PathBuf,
    kugou_cookie: PathBuf,
    beat_cache: PathBuf,
    updates: PathBuf,
    cookie_values: RwLock<HashMap<&'static str, String>>,
    kugou_vip_cache: RwLock<Option<(String, u64, Value)>>,
    login_sessions: tokio::sync::Mutex<HashMap<String, LoginSession<'static>>>,
    update_jobs: RwLock<HashMap<String, Value>>,
}

pub async fn serve(listener: tokio::net::TcpListener, paths: ServerPaths) -> Result<(), String> {
    let mut cookies = HashMap::new();
    cookies.insert("netease", read_text(&paths.cookie).await);
    cookies.insert("qq", read_text(&paths.qq_cookie).await);
    let raw_kugou_cookie = read_text(&paths.kugou_cookie).await;
    let kugou_cookie = if raw_kugou_cookie.is_empty() {
        raw_kugou_cookie
    } else {
        ensure_kugou_device_cookie(&raw_kugou_cookie)
    };
    if !kugou_cookie.is_empty() {
        let _ = tokio::fs::write(&paths.kugou_cookie, &kugou_cookie).await;
    }
    cookies.insert("kugou", kugou_cookie);
    let client = Box::leak(Box::new(MusicClient::new()));
    let state = Arc::new(ApiState {
        client,
        http: reqwest::Client::builder()
            .user_agent(USER_AGENT)
            .redirect(reqwest::redirect::Policy::limited(8))
            .build()
            .map_err(|e| e.to_string())?,
        public: paths.public,
        cookie: paths.cookie,
        qq_cookie: paths.qq_cookie,
        kugou_cookie: paths.kugou_cookie,
        beat_cache: paths.beat_cache,
        updates: paths.updates,
        cookie_values: RwLock::new(cookies),
        kugou_vip_cache: RwLock::new(None),
        login_sessions: tokio::sync::Mutex::new(HashMap::new()),
        update_jobs: RwLock::new(HashMap::new()),
    });
    let app = Router::new()
        .route("/api/app/version", get(app_version))
        .route("/api/update/latest", get(update_latest))
        .route("/api/update/download", any(update_download))
        .route("/api/update/download/status", get(update_download_status))
        .route("/api/update/patch", any(update_patch))
        .route("/api/update/patch/status", get(update_download_status))
        .route("/api/discover/home", get(discover_home))
        .route("/api/weather/ip-location", get(weather_ip_location))
        .route("/api/weather/radio", get(weather_radio))
        .route("/api/beatmap/cache/status", get(beat_cache_status))
        .route("/api/beatmap/cache", any(beat_cache))
        .route("/api/podcast/search", get(podcast_search))
        .route("/api/podcast/hot", get(podcast_hot))
        .route("/api/podcast/detail", get(podcast_detail))
        .route("/api/podcast/programs", get(podcast_programs))
        .route("/api/podcast/my", get(podcast_my))
        .route("/api/podcast/my/items", get(podcast_my_items))
        .route("/api/podcast/dj-beatmap", get(podcast_dj_beatmap))
        .route("/api/search", get(search_netease))
        .route("/api/qq/search", get(search_qq))
        .route("/api/qq/artist/detail", get(qq_artist_detail))
        .route("/api/qq/song/comments", get(qq_song_comments))
        .route("/api/qq/user/playlists", get(qq_user_playlists))
        .route("/api/song/url", get(song_url_netease))
        .route("/api/qq/song/url", get(song_url_qq))
        .route("/api/lyric", get(lyric_netease))
        .route("/api/qq/lyric", get(lyric_qq))
        .route("/api/playlist/tracks", get(playlist_netease))
        .route("/api/playlist/create", any(playlist_create))
        .route("/api/playlist/add-song", any(playlist_add_song))
        .route("/api/qq/playlist/tracks", get(playlist_qq))
        .route("/api/login/status", get(login_status_netease))
        .route("/api/login/qr/key", get(login_qr_key))
        .route("/api/login/qr/create", get(login_qr_create))
        .route("/api/login/qr/check", get(login_qr_check))
        .route("/api/user/playlists", get(user_playlists))
        .route("/api/song/like/check", get(song_like_check))
        .route("/api/song/like", any(song_like))
        .route("/api/song/comments", get(song_comments))
        .route("/api/artist/detail", get(artist_detail))
        .route("/api/qq/login/status", get(login_status_qq))
        .route("/api/qq/login/qr/key", get(qq_login_qr_key))
        .route("/api/qq/login/qr/check", get(qq_login_qr_check))
        .route("/api/kugou/login/status", get(login_status_kugou))
        .route("/api/kugou/login/qr/key", get(kugou_login_qr_key))
        .route("/api/kugou/login/qr/check", get(kugou_login_qr_check))
        .route("/api/kugou/user/playlists", get(kugou_user_playlists))
        .route("/api/kugou/playlist/tracks", get(kugou_playlist_tracks))
        .route("/api/kugou/song/like/check", get(kugou_song_like_check))
        .route("/api/kugou/song/like", any(kugou_song_like))
        .route("/api/kugou/song/url", get(kugou_song_url))
        .route("/api/kugou/lyric", get(kugou_lyric))
        .route("/api/login/cookie", any(save_netease_cookie))
        .route("/api/qq/login/cookie", any(save_qq_cookie))
        .route("/api/kugou/login/cookie", any(save_kugou_cookie))
        .route("/api/logout", any(logout_netease))
        .route("/api/qq/logout", any(logout_qq))
        .route("/api/kugou/logout", any(logout_kugou))
        .route("/api/cover", get(cover_proxy))
        .route("/api/audio", get(audio_proxy))
        .route("/favicon.ico", get(favicon))
        .route("/", get(index))
        .route("/{*path}", get(static_file))
        .with_state(state);
    axum::serve(listener, app).await.map_err(|e| e.to_string())
}

async fn read_text(path: &Path) -> String {
    tokio::fs::read_to_string(path)
        .await
        .unwrap_or_default()
        .trim()
        .to_owned()
}

fn json_response(value: Value) -> Response<Body> {
    let mut response = Json(value).into_response();
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate"),
    );
    response.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    response
}

async fn app_version() -> Response<Body> {
    json_response(json!({
        "name": "mineradio", "productName": "Mineradio", "version": env!("CARGO_PKG_VERSION"),
        "update": { "provider": "github", "configured": true, "owner": "prometheus-lumen", "repo": "Mineradio-Intel-Mac", "preview": false, "manifestOverride": true }
    }))
}

async fn update_latest(State(state): State<Arc<ApiState>>) -> Response<Body> {
    match fetch_update_info(&state).await {
        Ok(value) => json_response(value),
        Err(error) => (StatusCode::BAD_GATEWAY, Json(json!({"configured":true,"updateAvailable":false,"currentVersion":env!("CARGO_PKG_VERSION"),"error":error}))).into_response(),
    }
}

fn update_asset_key() -> &'static str {
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        "darwin-x64"
    }
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        "darwin-arm64"
    }
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        "win32-x64"
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "linux-x64"
    }
}

async fn fetch_update_info(state: &ApiState) -> Result<Value, String> {
    let url = "https://github.com/prometheus-lumen/Mineradio-Intel-Mac/releases/latest/download/Mineradio-update.json";
    let manifest = state
        .http
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json::<Value>()
        .await
        .map_err(|e| e.to_string())?;
    let version = manifest
        .get("version")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let asset = manifest
        .pointer(&format!("/assets/{}", update_asset_key()))
        .cloned()
        .unwrap_or_default();
    let name = asset
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let download_url = if name.is_empty() {
        String::new()
    } else {
        format!("https://github.com/prometheus-lumen/Mineradio-Intel-Mac/releases/latest/download/{name}")
    };
    Ok(json!({
        "configured":true,"currentVersion":env!("CARGO_PKG_VERSION"),"latestVersion":version,
        "updateAvailable":!version.is_empty() && version != env!("CARGO_PKG_VERSION"),"notes":manifest.get("notes"),
        "release":{"version":version,"htmlUrl":manifest.get("releaseUrl"),"downloadUrl":download_url,"asset":{"name":name,"size":asset.get("size"),"sha512":asset.get("sha512"),"downloadUrl":download_url}},
        "manifest":manifest
    }))
}

async fn update_download(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let info = match fetch_update_info(&state).await {
        Ok(info) => info,
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"ok":false,"error":error})),
            )
                .into_response()
        }
    };
    if !info
        .get("updateAvailable")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"ok":false,"error":"NO_UPDATE_AVAILABLE"})),
        )
            .into_response();
    }
    let url = info
        .pointer("/release/downloadUrl")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned();
    let name = info
        .pointer("/release/asset/name")
        .and_then(Value::as_str)
        .unwrap_or("Mineradio-update")
        .replace(['/', '\\'], "-");
    let version = info
        .get("latestVersion")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned();
    let id = uuid::Uuid::new_v4().to_string();
    let now = unix_millis();
    let job = json!({"ok":true,"id":id,"status":"queued","progress":0,"received":0,"total":info.pointer("/release/asset/size"),"speedBps":0,"etaSeconds":0,"mode":"installer","message":"准备下载完整安装包","fileName":name,"filePath":"","version":version,"releaseUrl":info.pointer("/release/htmlUrl"),"createdAt":now,"updatedAt":now});
    state
        .update_jobs
        .write()
        .await
        .insert(id.clone(), job.clone());
    let task_state = state.clone();
    let task_id = id.clone();
    tauri::async_runtime::spawn(async move {
        download_update_job(task_state, task_id, url, name).await;
    });
    json_response(job)
}

async fn download_update_job(state: Arc<ApiState>, id: String, url: String, name: String) {
    let dir = state.updates.join("downloads");
    let _ = tokio::fs::create_dir_all(&dir).await;
    let path = dir.join(name);
    if let Some(job) = state.update_jobs.write().await.get_mut(&id) {
        job["status"] = "downloading".into();
        job["message"] = "正在下载完整安装包".into();
    }
    let result = async {
        let response = state
            .http
            .get(url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .error_for_status()
            .map_err(|e| e.to_string())?;
        let total = response.content_length().unwrap_or_default();
        let mut stream = response.bytes_stream();
        let mut file = tokio::fs::File::create(&path)
            .await
            .map_err(|e| e.to_string())?;
        let mut received = 0u64;
        use tokio::io::AsyncWriteExt;
        while let Some(chunk) = futures_util::TryStreamExt::try_next(&mut stream)
            .await
            .map_err(|e| e.to_string())?
        {
            file.write_all(&chunk).await.map_err(|e| e.to_string())?;
            received += chunk.len() as u64;
            if let Some(job) = state.update_jobs.write().await.get_mut(&id) {
                job["received"] = received.into();
                job["total"] = total.into();
                job["progress"] = if total > 0 {
                    ((received * 100 / total).min(99)).into()
                } else {
                    1.into()
                };
                job["updatedAt"] = unix_millis().into();
            }
        }
        file.flush().await.map_err(|e| e.to_string())?;
        Ok::<_, String>(received)
    }
    .await;
    if let Some(job) = state.update_jobs.write().await.get_mut(&id) {
        match result {
            Ok(received) => {
                job["status"] = "ready".into();
                job["progress"] = 100.into();
                job["received"] = received.into();
                job["filePath"] = path.to_string_lossy().to_string().into();
                job["message"] = "安装包已下载".into();
            }
            Err(error) => {
                job["ok"] = false.into();
                job["status"] = "error".into();
                job["error"] = error.into();
                job["message"] = "下载失败".into();
            }
        }
        job["updatedAt"] = unix_millis().into();
    }
}

async fn update_download_status(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let jobs = state.update_jobs.read().await;
    let job = query
        .get("id")
        .and_then(|id| jobs.get(id))
        .cloned()
        .or_else(|| {
            jobs.values()
                .max_by_key(|job| {
                    job.get("createdAt")
                        .and_then(Value::as_u64)
                        .unwrap_or_default()
                })
                .cloned()
        });
    match job {
        Some(job) => json_response(job),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({"ok":false,"error":"UPDATE_JOB_NOT_FOUND"})),
        )
            .into_response(),
    }
}

async fn update_patch(State(state): State<Arc<ApiState>>) -> Response<Body> {
    // Tauri bundles are signed as a whole; use the verified full installer path instead of mutating app resources in place.
    update_download(State(state)).await
}

async fn discover_home(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let recommended = state
        .client
        .discover()
        .recommend_playlist()
        .platform(Platform::Netease)
        .send()
        .await;
    let toplists = state
        .client
        .discover()
        .toplist_list()
        .platform(Platform::Netease)
        .send()
        .await;
    let mut playlists = recommended
        .map(|value| value.playlists)
        .unwrap_or_default()
        .into_iter()
        .map(|item| json!({"id":item.id,"name":item.name,"cover":item.pic_url,"source":"推荐歌单"}))
        .collect::<Vec<_>>();
    if let Ok(value) = toplists {
        playlists.extend(value.toplists.into_iter().take(4).map(|item| json!({"id":item.id,"name":item.name,"cover":item.pic_url.unwrap_or_default(),"source":"排行榜"})));
    }
    playlists.truncate(10);
    json_response(json!({
        "loggedIn": false, "user": null, "dailySongs": [], "playlists": playlists,
        "podcasts": [], "mode": "starter", "updatedAt": unix_millis()
    }))
}

async fn weather_ip_location(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let url = "http://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon,timezone,query&lang=zh-CN";
    match state
        .http
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(response) => match response.json::<Value>().await {
            Ok(body) if body.get("status").and_then(Value::as_str) == Some("success") => {
                json_response(json!({"ok":true,"location":{
                    "provider":"ip-api", "city":body.get("city"), "region":body.get("regionName"), "country":body.get("country"),
                    "latitude":body.get("lat"), "longitude":body.get("lon"), "timezone":body.get("timezone"), "ip":body.get("query")
                }}))
            }
            Ok(body) => (
                StatusCode::BAD_GATEWAY,
                Json(json!({"ok":false,"error":body.get("message"),"location":null})),
            )
                .into_response(),
            Err(error) => (
                StatusCode::BAD_GATEWAY,
                Json(json!({"ok":false,"error":error.to_string(),"location":null})),
            )
                .into_response(),
        },
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"ok":false,"error":error.to_string(),"location":null})),
        )
            .into_response(),
    }
}

async fn weather_radio(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let lat = query
        .get("lat")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(31.2304);
    let lon = query
        .get("lon")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(121.4737);
    let city = query
        .get("city")
        .or_else(|| query.get("q"))
        .cloned()
        .unwrap_or_else(|| "上海".into());
    let url = format!("https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,is_day&timezone=auto");
    let weather_data = match state
        .http
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(response) => response.json::<Value>().await.unwrap_or_default(),
        Err(_) => Value::Null,
    };
    let current = weather_data.get("current").cloned().unwrap_or_default();
    let code = current
        .get("weather_code")
        .and_then(Value::as_i64)
        .unwrap_or(-1);
    let (label, title, tagline, queries) = weather_mood(
        code,
        current.get("is_day").and_then(Value::as_i64).unwrap_or(1) == 1,
    );
    let mut songs = Vec::new();
    for seed in queries.iter().take(4) {
        if let Ok(result) = state
            .client
            .search()
            .song()
            .keyword(*seed)
            .limit(5)
            .platform(Platform::Netease)
            .send()
            .await
        {
            songs.extend(
                result
                    .songs
                    .into_iter()
                    .map(|song| platform_song(song, "netease")),
            );
        }
    }
    songs.truncate(18);
    json_response(json!({"ok":true,"weather":{
        "provider":"open-meteo","location":{"name":city,"latitude":lat,"longitude":lon,"timezone":weather_data.get("timezone")},
        "label":label,"weatherCode":code,"temperature":current.get("temperature_2m"),"apparentTemperature":current.get("apparent_temperature"),
        "humidity":current.get("relative_humidity_2m"),"precipitation":current.get("precipitation"),"cloudCover":current.get("cloud_cover"),
        "windSpeed":current.get("wind_speed_10m"),"windGusts":current.get("wind_gusts_10m"),"isDay":current.get("is_day"),"updatedAt":unix_millis()
    },"radio":{"title":title,"subtitle":tagline,"seedQueries":queries,"songs":songs,"updatedAt":unix_millis()}}))
}

fn weather_mood(
    code: i64,
    is_day: bool,
) -> (&'static str, &'static str, &'static str, Vec<&'static str>) {
    if code >= 95 {
        return (
            "雷雨",
            "雷雨电台",
            "让节奏盖过窗外的雷声。",
            vec!["周杰伦 雨下一整晚", "孙燕姿 遇见", "毛不易 消愁"],
        );
    }
    if (71..=77).contains(&code) {
        return (
            "雪",
            "雪夜电台",
            "安静、通透，留一点白。",
            vec!["李健 贝加尔湖畔", "陈奕迅 好久不见", "朴树 平凡之路"],
        );
    }
    if (51..=82).contains(&code) {
        return (
            "雨",
            "雨天电台",
            "适合把声音调近一点。",
            vec![
                "陈奕迅 阴天快乐",
                "周杰伦 雨下一整晚",
                "孙燕姿 遇见",
                "林宥嘉 说谎",
            ],
        );
    }
    if !is_day {
        return (
            "夜晚",
            "夜色电台",
            "慢一点，让夜色接管。",
            vec!["方大同 特别的人", "陶喆 爱很简单", "林忆莲 夜太黑"],
        );
    }
    if code <= 1 {
        return (
            "晴",
            "晴日电台",
            "把今天调成明亮模式。",
            vec!["周杰伦 晴天", "五月天 温柔", "孙燕姿 天黑黑"],
        );
    }
    (
        "多云",
        "云层电台",
        "柔和一点，也刚刚好。",
        vec!["莫文蔚 阴天", "陈绮贞 旅行的意义", "王菲"],
    )
}

fn unix_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

async fn beat_cache_status(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let writable = tokio::fs::create_dir_all(&state.beat_cache).await.is_ok();
    json_response(
        json!({"ok":true,"enabled":writable,"mode":if writable {"disk"} else {"memory-only"},"dir":state.beat_cache,"reason":if writable {Value::Null} else {json!("BEAT_CACHE_UNAVAILABLE")}}),
    )
}

fn safe_cache_key(raw: &str) -> String {
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
        .take(160)
        .collect()
}

async fn beat_cache(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    request: Request,
) -> Response<Body> {
    if request.method() == axum::http::Method::GET {
        let key = safe_cache_key(query.get("key").map(String::as_str).unwrap_or_default());
        if key.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"ok":false,"error":"MISSING_CACHE_KEY"})),
            )
                .into_response();
        }
        let path = state.beat_cache.join(format!("{key}.json"));
        return match tokio::fs::read(&path).await {
            Ok(bytes) => match serde_json::from_slice::<Value>(&bytes) {
                Ok(value) => json_response(
                    json!({"ok":true,"hit":true,"enabled":true,"mode":"disk","key":key,"map":value,"dir":state.beat_cache}),
                ),
                Err(error) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"ok":false,"hit":false,"error":error.to_string()})),
                )
                    .into_response(),
            },
            Err(_) => json_response(
                json!({"ok":true,"hit":false,"enabled":true,"mode":"disk","key":key,"dir":state.beat_cache}),
            ),
        };
    }
    if request.method() == axum::http::Method::POST {
        let body = request_json(request).await;
        let key = safe_cache_key(body.get("key").and_then(Value::as_str).unwrap_or_default());
        let map = body.get("map").cloned().unwrap_or_default();
        if key.is_empty() || map.is_null() {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"ok":false,"error":"INVALID_CACHE_PAYLOAD"})),
            )
                .into_response();
        }
        if let Err(error) = tokio::fs::create_dir_all(&state.beat_cache).await {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"ok":false,"error":error.to_string()})),
            )
                .into_response();
        }
        let path = state.beat_cache.join(format!("{key}.json"));
        return match serde_json::to_vec(&map).ok().map(|bytes| (bytes, path)) {
            Some((bytes, path)) => match tokio::fs::write(path, bytes).await {
                Ok(_) => json_response(
                    json!({"ok":true,"enabled":true,"mode":"disk","key":key,"dir":state.beat_cache}),
                ),
                Err(error) => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"ok":false,"error":error.to_string()})),
                )
                    .into_response(),
            },
            None => (
                StatusCode::BAD_REQUEST,
                Json(json!({"ok":false,"error":"CACHE_SERIALIZE_FAILED"})),
            )
                .into_response(),
        };
    }
    StatusCode::METHOD_NOT_ALLOWED.into_response()
}

async fn podcast_search(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let keyword = query.get("keywords").cloned().unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(18)
        .clamp(1, 50);
    match ncm(&state)
        .search(
            &keyword,
            Some(json!({"type":1009,"limit":limit,"offset":0})),
        )
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => {
            let raw = body
                .pointer("/result/djRadios")
                .or_else(|| body.pointer("/result/radios"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            json_response(
                json!({"radios":raw.into_iter().map(map_podcast_radio).collect::<Vec<_>>()}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"radios":[]})),
        )
            .into_response(),
    }
}

async fn podcast_hot(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let mut q = query;
    q.insert("keywords".into(), "播客 电台".into());
    podcast_search(State(state), Query(q)).await
}

async fn podcast_detail(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("id")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or_default();
    match ncm(&state)
        .podcast_audio(id, Some(json!({"limit":1,"offset":0})))
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => json_response(
            json!({"radio":map_podcast_radio(body.get("djRadio").or_else(||body.get("radio")).cloned().unwrap_or_default()),"body":body}),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"radio":null})),
        )
            .into_response(),
    }
}

async fn podcast_programs(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("id")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(36)
        .clamp(1, 100);
    match ncm(&state)
        .podcast_audio(id, Some(json!({"limit":limit,"offset":0})))
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => {
            let raw = body
                .get("programs")
                .or_else(|| body.pointer("/data/programs"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            json_response(
                json!({"programs":raw.into_iter().map(map_podcast_program).collect::<Vec<_>>(),"more":body.get("more")}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"programs":[]})),
        )
            .into_response(),
    }
}

async fn podcast_my(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let Some((uid, _)) = ncm_profile(&state).await else {
        return json_response(json!({"loggedIn":false,"collections":[]}));
    };
    match ncm(&state).user_podcast(uid).await.and_then(|r| {
        r.deserialize::<Value>()
            .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
    }) {
        Ok(body) => {
            let raw = body
                .get("djRadios")
                .or_else(|| body.get("radios"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            json_response(
                json!({"loggedIn":true,"collections":[{"key":"created","name":"我的播客","count":raw.len(),"items":raw.into_iter().map(map_podcast_radio).collect::<Vec<_>>()}]}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"loggedIn":true,"collections":[]})),
        )
            .into_response(),
    }
}

async fn podcast_my_items(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let Some((uid, _)) = ncm_profile(&state).await else {
        return json_response(json!({"loggedIn":false,"itemType":"radio","items":[]}));
    };
    match ncm(&state).user_podcast(uid).await.and_then(|r| {
        r.deserialize::<Value>()
            .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
    }) {
        Ok(body) => {
            let raw = body
                .get("djRadios")
                .or_else(|| body.get("radios"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            json_response(
                json!({"loggedIn":true,"itemType":"radio","items":raw.into_iter().map(map_podcast_radio).collect::<Vec<_>>()}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"items":[]})),
        )
            .into_response(),
    }
}

fn map_podcast_radio(r: Value) -> Value {
    json!({"id":r.get("id").or_else(||r.get("rid")).or_else(||r.get("radioId")),"rid":r.get("id").or_else(||r.get("rid")),"name":r.get("name").or_else(||r.get("radioName")),"cover":r.get("picUrl").or_else(||r.get("coverUrl")).or_else(||r.get("coverImgUrl")),"desc":r.get("desc").or_else(||r.get("description")),"djName":r.pointer("/dj/nickname").or_else(||r.get("djName")),"category":r.get("category").or_else(||r.get("categoryName")),"programCount":r.get("programCount").or_else(||r.get("programNum")),"subCount":r.get("subCount").or_else(||r.get("subscriberCount"))})
}

fn map_podcast_program(p: Value) -> Value {
    let song = p
        .get("mainSong")
        .or_else(|| p.get("song"))
        .cloned()
        .unwrap_or_default();
    let radio = p.get("radio").cloned().unwrap_or_default();
    json!({"type":"podcast","source":"podcast","id":song.get("id").or_else(||p.get("mainSongId")),"programId":p.get("id").or_else(||p.get("programId")),"radioId":radio.get("id"),"name":p.get("name").or_else(||song.get("name")),"artist":radio.get("name").or_else(||p.pointer("/dj/nickname")),"album":radio.get("name"),"cover":p.get("coverUrl").or_else(||radio.get("picUrl")).or_else(||song.pointer("/al/picUrl")),"duration":p.get("duration").or_else(||song.get("dt")),"fee":song.get("fee"),"desc":p.get("description").or_else(||p.get("desc")),"createTime":p.get("createTime")})
}

async fn podcast_dj_beatmap(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let url = query.get("url").cloned().unwrap_or_default();
    let duration = query
        .get("duration")
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or_default();
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"ok":false,"error":"Missing audio url"})),
        )
            .into_response();
    }
    let response = match state
        .http
        .get(&url)
        .header(header::REFERER, "https://music.163.com/")
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(response) => response,
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"ok":false,"error":error.to_string()})),
            )
                .into_response()
        }
    };
    if response.content_length().unwrap_or_default() > 256 * 1024 * 1024 {
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({"ok":false,"error":"AUDIO_TOO_LARGE"})),
        )
            .into_response();
    }
    let bytes = match response.bytes().await {
        Ok(bytes) => bytes.to_vec(),
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"ok":false,"error":error.to_string()})),
            )
                .into_response()
        }
    };
    match tokio::task::spawn_blocking(move || crate::analyzer::analyze(bytes, duration)).await {
        Ok(Ok(map)) => json_response(json!({"ok":true,"map":map})),
        Ok(Err(error)) => (
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({"ok":false,"error":error})),
        )
            .into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"ok":false,"error":error.to_string()})),
        )
            .into_response(),
    }
}

fn platform_song(song: Song, source: &str) -> Value {
    let artist = song
        .artists
        .iter()
        .map(|a| a.name.as_str())
        .collect::<Vec<_>>()
        .join(" / ");
    let artist_id = song
        .artists
        .first()
        .map(|a| a.id.clone())
        .unwrap_or_default();
    json!({
        "id": song.id, "mid": if source == "qq" { song.id.clone() } else { String::new() },
        "name": song.name, "artist": artist, "artistId": artist_id,
        "album": song.album.name, "albumId": song.album.id, "cover": song.pic_url,
        "source": source
    })
}

async fn search(
    state: Arc<ApiState>,
    query: HashMap<String, String>,
    platform: Platform,
    source: &'static str,
) -> Response<Body> {
    let keyword = query
        .get("keywords")
        .or_else(|| query.get("keyword"))
        .cloned()
        .unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(30)
        .clamp(1, 100);
    if keyword.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing keywords","songs":[]})),
        )
            .into_response();
    }
    match state
        .client
        .search()
        .song()
        .keyword(keyword)
        .limit(limit)
        .platform(platform)
        .send()
        .await
    {
        Ok(result) => json_response(
            json!({ "songs": result.songs.into_iter().map(|s| platform_song(s, source)).collect::<Vec<_>>(), "more": result.more }),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": error.to_string(), "songs": [] })),
        )
            .into_response(),
    }
}

async fn search_netease(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    search(state, query, Platform::Netease, "netease").await
}
async fn search_qq(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    search(state, query, Platform::Tencent, "qq").await
}

async fn qq_artist_detail(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("mid")
        .or_else(|| query.get("id"))
        .cloned()
        .unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(30)
        .clamp(10, 80);
    match state
        .client
        .detail()
        .artist()
        .id(id.clone())
        .limit(limit)
        .platform(Platform::Tencent)
        .send()
        .await
    {
        Ok(result) => json_response(
            json!({"provider":"qq","id":id,"artist":{"id":result.id,"mid":result.id,"name":result.name,"avatar":result.pic_url,"brief":result.description},"songs":result.songs.into_iter().map(|s|platform_song(s,"qq")).collect::<Vec<_>>()}),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"songs":[]})),
        )
            .into_response(),
    }
}

async fn qq_song_comments(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query.get("id").cloned().unwrap_or_default();
    let mid = query.get("mid").cloned().unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(20)
        .clamp(6, 50);
    if id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing QQ song id","comments":[]})),
        )
            .into_response();
    }
    let url = format!("https://c.y.qq.com/base/fcgi-bin/fcg_global_comment_h5.fcg?g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0&cid=205360772&reqtype=2&biztype=1&topid={id}&cmd=8&pagenum=0&pagesize={limit}");
    match state
        .http
        .get(url)
        .header(
            header::REFERER,
            format!("https://y.qq.com/n/ryqq/songDetail/{mid}"),
        )
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(response) => match response.json::<Value>().await {
            Ok(body) => {
                let raw = body
                    .pointer("/hot_comment/commentlist")
                    .or_else(|| body.pointer("/comment/commentlist"))
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default();
                let comments = raw.into_iter().map(|c|json!({"id":c.get("commentid").or_else(||c.get("id")),"content":c.get("rootcommentcontent").or_else(||c.get("content")),"likedCount":c.get("praisenum"),"time":c.get("time"),"user":{"id":c.get("encrypt_uin").or_else(||c.get("uin")),"nickname":c.get("nick").or_else(||c.get("nickname")),"avatar":c.get("avatarurl").or_else(||c.get("avatar"))}})).collect::<Vec<_>>();
                json_response(
                    json!({"provider":"qq","id":id,"total":body.pointer("/comment/commenttotal"),"comments":comments,"hot":true}),
                )
            }
            Err(error) => (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error":error.to_string(),"comments":[]})),
            )
                .into_response(),
        },
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"comments":[]})),
        )
            .into_response(),
    }
}

async fn qq_user_playlists(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("qq")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uin = qq_uin(&map);
    if uin.is_empty() || qq_playback_key(&map).is_empty() {
        return json_response(json!({"loggedIn":false,"provider":"qq","playlists":[]}));
    }
    let created_url = format!("https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss?hostUin=0&hostuin={uin}&sin=0&size=200&g_tk=5381&loginUin={uin}&format=json&inCharset=utf8&outCharset=utf-8&platform=yqq.json&needNewCode=0");
    let collected_url = format!("https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg?ct=20&cid=205360956&userid={uin}&reqtype=3&sin=0&ein=80");
    let get = |url: String| {
        state
            .http
            .get(url)
            .header(header::COOKIE, cookie.clone())
            .header(header::REFERER, "https://y.qq.com/portal/profile.html")
            .send()
    };
    let (created, collected) = tokio::join!(get(created_url), get(collected_url));
    let mut playlists = Vec::new();
    for response in [created.ok(), collected.ok()].into_iter().flatten() {
        if let Ok(body) = response.json::<Value>().await {
            let is_collected = body.pointer("/data/cdlist").is_some();
            let raw = body
                .pointer("/data/disslist")
                .or_else(|| body.pointer("/data/cdlist"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            playlists.extend(raw.into_iter().filter_map(|p| {
                let id = p
                    .get("dissid")
                    .or_else(|| p.get("tid"))
                    .or_else(|| p.get("dirid"))
                    .or_else(|| p.get("id"))
                    .or_else(|| p.get("diss_id"))
                    .cloned()
                    .unwrap_or_default();
                let name = p
                    .get("diss_name")
                    .or_else(|| p.get("dissname"))
                    .or_else(|| p.get("name"))
                    .or_else(|| p.get("title"))
                    .cloned()
                    .unwrap_or_default();
                if id.is_null() || name.as_str().unwrap_or_default().is_empty() {
                    return None;
                }
                Some(json!({
                    "provider":"qq", "source":"qq", "id":id, "name":name,
                    "cover":p.get("diss_cover").or_else(||p.get("logo")).or_else(||p.get("picurl")).or_else(||p.get("cover")),
                    "trackCount":p.get("song_cnt").or_else(||p.get("songnum")).or_else(||p.get("total_song_num")).or_else(||p.get("song_count")),
                    "playCount":p.get("listen_num").or_else(||p.get("visitnum")).or_else(||p.get("play_count")),
                    "creator":p.get("hostname").or_else(||p.get("nick")).or_else(||p.get("creator")).or_else(||p.get("nickname")),
                    "subscribed":is_collected, "specialType":0
                }))
            }));
        }
    }
    let mut seen = std::collections::HashSet::new();
    playlists.retain(|playlist| {
        let id = playlist.get("id").map(Value::to_string).unwrap_or_default();
        let name = playlist
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default();
        !id.is_empty() && id != "0" && !name.contains("QZone背景音乐") && seen.insert(id)
    });
    json_response(json!({"loggedIn":true,"provider":"qq","userId":uin,"playlists":playlists}))
}

fn map_qq_playlist_track(raw: Value) -> Value {
    let track = raw
        .get("track_info")
        .or_else(|| raw.get("songInfo"))
        .or_else(|| raw.get("songinfo"))
        .or_else(|| raw.get("song"))
        .cloned()
        .unwrap_or_else(|| raw.clone());
    let album = track.get("album").cloned().unwrap_or_default();
    let artists = track
        .get("singer")
        .or_else(|| track.get("singers"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let artist = artists
        .iter()
        .filter_map(|artist| artist.get("name").and_then(Value::as_str))
        .collect::<Vec<_>>()
        .join(" / ");
    let mid = track
        .get("mid")
        .or_else(|| track.get("songmid"))
        .or_else(|| raw.get("mid"))
        .or_else(|| raw.get("songmid"))
        .cloned()
        .unwrap_or_default();
    let album_mid = album
        .get("mid")
        .or_else(|| track.get("albummid"))
        .or_else(|| raw.get("albummid"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let cover = if album_mid.is_empty() {
        String::new()
    } else {
        format!("https://y.gtimg.cn/music/photo_new/T002R300x300M000{album_mid}.jpg")
    };
    let interval = track
        .get("interval")
        .or_else(|| raw.get("interval"))
        .and_then(Value::as_u64)
        .unwrap_or_default();
    json!({
        "provider":"qq", "source":"qq", "type":"qq", "id":mid, "mid":mid,
        "songmid":mid, "qqId":track.get("id").or_else(||track.get("songid")).or_else(||raw.get("id")).or_else(||raw.get("songid")),
        "mediaMid":track.pointer("/file/media_mid").or_else(||track.get("strMediaMid")).or_else(||track.get("media_mid")).or_else(||raw.get("strMediaMid")),
        "name":track.get("name").or_else(||track.get("songname")).or_else(||raw.get("songname")),
        "artist":if artist.is_empty(){track.get("singername").or_else(||raw.get("singername")).and_then(Value::as_str).unwrap_or_default()}else{&artist},
        "artists":artists, "artistId":artists.first().and_then(|a|a.get("id")), "artistMid":artists.first().and_then(|a|a.get("mid")),
        "album":album.get("name").or_else(||album.get("title")).or_else(||track.get("albumname")).or_else(||raw.get("albumname")),
        "albumMid":album_mid, "cover":cover, "duration":interval*1000, "playable":false
    })
}

async fn qq_playlist_tracks(
    state: Arc<ApiState>,
    query: HashMap<String, String>,
) -> Response<Body> {
    let id = query
        .get("id")
        .or_else(|| query.get("disstid"))
        .cloned()
        .unwrap_or_default();
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("qq")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uin = qq_uin(&map).to_owned();
    if uin.is_empty() || qq_playback_key(&map).is_empty() {
        return json_response(json!({"loggedIn":false,"provider":"qq","tracks":[]}));
    }
    if id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing QQ playlist id","tracks":[]})),
        )
            .into_response();
    }
    let mut url =
        reqwest::Url::parse("https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg")
            .unwrap();
    for (key, value) in [
        ("type", "1"),
        ("utf8", "1"),
        ("disstid", id.as_str()),
        ("loginUin", uin.as_str()),
        ("format", "json"),
        ("inCharset", "utf8"),
        ("outCharset", "utf-8"),
        ("notice", "0"),
        ("platform", "yqq.json"),
        ("needNewCode", "0"),
    ] {
        url.query_pairs_mut().append_pair(key, value);
    }
    match state
        .http
        .get(url)
        .header(header::COOKIE, cookie)
        .header(header::REFERER, "https://y.qq.com/n/yqq/playlist")
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(response) => match response.json::<Value>().await {
            Ok(body) => {
                let detail = body
                    .get("cdlist")
                    .and_then(Value::as_array)
                    .and_then(|a| a.first())
                    .cloned()
                    .unwrap_or_default();
                let tracks = detail
                    .get("songlist")
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(map_qq_playlist_track)
                    .filter(|song| {
                        !song.get("name").unwrap_or(&Value::Null).is_null()
                            && !song.get("mid").unwrap_or(&Value::Null).is_null()
                    })
                    .collect::<Vec<_>>();
                json_response(
                    json!({"loggedIn":true,"provider":"qq","playlist":{"provider":"qq","id":id,"name":detail.get("dissname").or_else(||detail.get("diss_name")).or_else(||detail.get("name")),"cover":detail.get("logo").or_else(||detail.get("diss_cover")),"trackCount":tracks.len()},"tracks":tracks}),
                )
            }
            Err(error) => (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error":error.to_string(),"tracks":[]})),
            )
                .into_response(),
        },
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"tracks":[]})),
        )
            .into_response(),
    }
}

fn quality(value: Option<&String>) -> SongQuality {
    match value.map(String::as_str).unwrap_or_default() {
        "lossless" | "hires" | "jyeffect" | "sky" | "dolby" => SongQuality::Lossless,
        "exhigh" | "320" => SongQuality::Exhigh,
        _ => SongQuality::Standard,
    }
}

async fn song_url(
    state: Arc<ApiState>,
    query: HashMap<String, String>,
    platform: Platform,
    login_info: Option<Value>,
) -> Response<Body> {
    let id = query
        .get("mid")
        .or_else(|| query.get("id"))
        .cloned()
        .unwrap_or_default();
    if id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing song id"})),
        )
            .into_response();
    }
    match state
        .client
        .playback()
        .url()
        .id(id)
        .level(quality(query.get("quality")))
        .platform(platform)
        .send()
        .await
    {
        Ok(result) => json_response(merge_json(
            json!({ "url": result.url, "trial": false, "playable": !result.url.is_empty(), "level": format!("{:?}", result.level).to_lowercase() }),
            login_info.unwrap_or_default(),
        )),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": error.to_string(), "url": null, "playable": false })),
        )
            .into_response(),
    }
}

async fn song_url_netease(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let login_info = match netease_login_info(&state).await {
        Some(info) => info,
        None => {
            let cookie = state
                .cookie_values
                .read()
                .await
                .get("netease")
                .cloned()
                .unwrap_or_default();
            login_status_value_for(&cookie, "netease")
        }
    };
    song_url(state, query, Platform::Netease, Some(login_info)).await
}
async fn song_url_qq(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("mid")
        .or_else(|| query.get("id"))
        .cloned()
        .unwrap_or_default();
    if id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"provider":"qq","error":"Missing song id","playable":false})),
        )
            .into_response();
    }
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("qq")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uin = qq_uin(&map).parse::<u64>().unwrap_or_default();
    let music_key = qq_music_key(&map).to_owned();
    let token = TencentLoginToken::new(
        uin,
        music_key.clone(),
        map.get("psrf_qqrefresh_token")
            .or_else(|| map.get("wxrefresh_token"))
            .copied()
            .unwrap_or_default(),
        map.get("psrf_qqaccess_token")
            .or_else(|| map.get("wxskey"))
            .copied()
            .unwrap_or_default(),
        None,
        map.get("login_type")
            .or_else(|| map.get("tmeLoginType"))
            .and_then(|value| value.parse().ok())
            .unwrap_or(1),
    );
    let request = state
        .client
        .playback()
        .url()
        .id(id)
        .level(quality(query.get("quality")))
        .platform(Platform::Tencent);
    let result = if uin > 0 && !music_key.is_empty() {
        request.login(&token).send().await
    } else {
        request.send().await
    };
    match result {
        Ok(result) => json_response(json!({
            "provider":"qq", "url":result.url, "trial":false,
            "playable":!result.url.is_empty(), "loggedIn":uin>0 && !music_key.is_empty(),
            "playbackKeyReady":!qq_playback_key(&map).is_empty(),
            "level":format!("{:?}", result.level).to_lowercase()
        })),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"provider":"qq","error":error.to_string(),"url":null,"playable":false,"loggedIn":uin>0 && !music_key.is_empty()})),
        )
            .into_response(),
    }
}

async fn lyric(
    state: Arc<ApiState>,
    query: HashMap<String, String>,
    platform: Platform,
) -> Response<Body> {
    let id = query
        .get("mid")
        .or_else(|| query.get("id"))
        .cloned()
        .unwrap_or_default();
    if id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing song id","lyric":""})),
        )
            .into_response();
    }
    match state
        .client
        .playback()
        .lyric()
        .id(id)
        .platform(platform)
        .send()
        .await
    {
        Ok(result) => json_response(
            json!({ "lyric": result.lyric, "tlyric": result.trans_lyric.unwrap_or_default(), "yrc": "", "source": "rust" }),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": error.to_string(), "lyric": "" })),
        )
            .into_response(),
    }
}

async fn lyric_netease(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    lyric(state, query, Platform::Netease).await
}
async fn lyric_qq(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    lyric(state, query, Platform::Tencent).await
}

async fn playlist_netease(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("id")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or_default();
    if id == 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing playlist id","tracks":[]})),
        )
            .into_response();
    }
    let detail = match ncm(&state).playlist_detail(id, Some(json!({"s":0}))).await {
        Ok(response) => match response.deserialize::<Value>() {
            Ok(body) => body,
            Err(_) => {
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({"error":"Invalid playlist response","tracks":[]})),
                )
                    .into_response()
            }
        },
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error":error.to_string(),"tracks":[]})),
            )
                .into_response()
        }
    };
    let playlist = detail.get("playlist").cloned().unwrap_or_default();
    let mut songs = playlist
        .get("tracks")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let track_ids = playlist
        .get("trackIds")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|track| {
            track
                .get("id")
                .and_then(Value::as_u64)
                .map(|id| id as usize)
        })
        .collect::<Vec<_>>();
    if songs.len() < track_ids.len() && !track_ids.is_empty() {
        let mut complete = Vec::new();
        for chunk in track_ids.chunks(500) {
            if let Ok(response) = ncm(&state).song_detail(chunk).await {
                if let Ok(body) = response.deserialize::<Value>() {
                    complete.extend(
                        body.get("songs")
                            .and_then(Value::as_array)
                            .cloned()
                            .unwrap_or_default(),
                    );
                }
            }
        }
        if !complete.is_empty() {
            songs = complete;
        }
    }
    let tracks = songs.into_iter().map(map_ncm_song).collect::<Vec<_>>();
    json_response(json!({
        "playlist": {
            "id": playlist.get("id").cloned().unwrap_or(json!(id)),
            "name": playlist.get("name"),
            "cover": playlist.get("coverImgUrl"),
            "trackCount": playlist.get("trackCount").cloned().unwrap_or(json!(tracks.len()))
        },
        "tracks": tracks
    }))
}
async fn playlist_qq(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    qq_playlist_tracks(state, query).await
}

fn parse_cookie_map(raw: &str) -> HashMap<&str, &str> {
    raw.split(';')
        .filter_map(|part| part.trim().split_once('='))
        .collect()
}

fn qq_uin<'a>(map: &'a HashMap<&str, &str>) -> &'a str {
    map.get("uin")
        .or_else(|| map.get("qqmusic_uin"))
        .or_else(|| map.get("wxuin"))
        .or_else(|| map.get("p_uin"))
        .copied()
        .unwrap_or_default()
        .trim_start_matches('o')
        .trim_start_matches('0')
}

fn qq_playback_key<'a>(map: &'a HashMap<&str, &str>) -> &'a str {
    map.get("qm_keyst")
        .or_else(|| map.get("qqmusic_key"))
        .or_else(|| map.get("music_key"))
        .or_else(|| map.get("wxskey"))
        .copied()
        .unwrap_or_default()
}

fn qq_music_key<'a>(map: &'a HashMap<&str, &str>) -> &'a str {
    map.get("qm_keyst")
        .or_else(|| map.get("qqmusic_key"))
        .or_else(|| map.get("music_key"))
        .or_else(|| map.get("p_skey"))
        .or_else(|| map.get("skey"))
        .or_else(|| map.get("psrf_qqaccess_token"))
        .or_else(|| map.get("psrf_qqrefresh_token"))
        .or_else(|| map.get("wxrefresh_token"))
        .or_else(|| map.get("wxskey"))
        .copied()
        .unwrap_or_default()
}

fn login_status_value_for(cookie: &str, service: &'static str) -> Value {
    let map = parse_cookie_map(cookie);
    let logged_in = match service {
        "netease" => map.get("MUSIC_U").is_some(),
        "qq" => !qq_uin(&map).is_empty() && !qq_playback_key(&map).is_empty(),
        "kugou" => {
            map.get("userid")
                .or_else(|| map.get("user_id"))
                .or_else(|| map.get("uid"))
                .or_else(|| map.get("KugooID"))
                .is_some()
                && map
                    .get("token")
                    .or_else(|| map.get("user_token"))
                    .or_else(|| map.get("access_token"))
                    .or_else(|| map.get("KuGoo"))
                    .or_else(|| map.get("t"))
                    .is_some()
        }
        _ => false,
    };
    let decode = |value: &str| {
        percent_decode_str(value)
            .decode_utf8_lossy()
            .trim()
            .to_owned()
    };
    let user_id = match service {
        "qq" => qq_uin(&map),
        "kugou" => map
            .get("userid")
            .or_else(|| map.get("user_id"))
            .or_else(|| map.get("uid"))
            .or_else(|| map.get("KugooID"))
            .copied()
            .unwrap_or_default(),
        _ => "",
    };
    let nickname = match service {
        "qq" => map
            .get("nickname")
            .or_else(|| map.get("nick"))
            .or_else(|| map.get("qq_nickname"))
            .map(|value| decode(value))
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "QQ 音乐".into()),
        "kugou" => map
            .get("nickname")
            .or_else(|| map.get("nick"))
            .or_else(|| map.get("username"))
            .or_else(|| map.get("user_name"))
            .map(|value| decode(value))
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "酷狗音乐用户".into()),
        _ => String::new(),
    };
    let avatar = match service {
        "qq" => map
            .get("qqmusic_avatar")
            .or_else(|| map.get("avatar"))
            .or_else(|| map.get("avatarUrl"))
            .or_else(|| map.get("headpic"))
            .map(|value| decode(value))
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| {
                if user_id.is_empty() {
                    String::new()
                } else {
                    format!("https://q1.qlogo.cn/g?b=qq&nk={user_id}&s=100")
                }
            }),
        "kugou" => map
            .get("avatar")
            .or_else(|| map.get("pic"))
            .or_else(|| map.get("img"))
            .or_else(|| map.get("icon"))
            .or_else(|| map.get("headpic"))
            .or_else(|| map.get("user_pic"))
            .map(|value| decode(value))
            .unwrap_or_default(),
        _ => String::new(),
    };
    let vip_type = if service == "kugou" {
        map.get("vipType")
            .or_else(|| map.get("vip_type"))
            .or_else(|| map.get("viptype"))
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or_default()
    } else {
        0
    };
    let is_vip = vip_type > 0;
    json!({
        "provider": service,
        "loggedIn": logged_in,
        "hasCookie": !cookie.is_empty(),
        "source": service,
        "userId": user_id,
        "nickname": nickname,
        "avatar": avatar,
        "vipType": vip_type,
        "vipLevel": if is_vip { "vip" } else { "none" },
        "isVip": is_vip,
        "isSvip": false,
        "vipLabel": if is_vip { "酷狗 VIP" } else { "无 VIP" },
        "playbackKeyReady": service != "qq" || !qq_playback_key(&map).is_empty()
    })
}

async fn login_status_for(state: Arc<ApiState>, service: &'static str) -> Response<Body> {
    let cookie = state
        .cookie_values
        .read()
        .await
        .get(service)
        .cloned()
        .unwrap_or_default();
    json_response(login_status_value_for(&cookie, service))
}

async fn login_qr_key(State(state): State<Arc<ApiState>>) -> Response<Body> {
    match state
        .client
        .login()
        .session()
        .platform(Platform::Netease)
        .send()
        .await
    {
        Ok(session) => {
            let key = uuid::Uuid::new_v4().to_string();
            state
                .login_sessions
                .lock()
                .await
                .insert(key.clone(), session);
            json_response(json!({"key":key}))
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string()})),
        )
            .into_response(),
    }
}

async fn login_qr_create(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let key = query.get("key").cloned().unwrap_or_default();
    let sessions = state.login_sessions.lock().await;
    match sessions.get(&key) {
        Some(session) => json_response(json!({"img":session.qr_code(),"url":session.qr_code()})),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({"error":"QR_SESSION_NOT_FOUND"})),
        )
            .into_response(),
    }
}

async fn login_qr_check(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let key = query.get("key").cloned().unwrap_or_default();
    let mut sessions = state.login_sessions.lock().await;
    let Some(session) = sessions.get(&key) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({"code":800,"message":"二维码已过期"})),
        )
            .into_response();
    };
    match session.status().await {
        Ok(LoginStatus::WaitingScan) => json_response(json!({"code":801,"message":"等待扫码"})),
        Ok(LoginStatus::WaitingConfirm) => {
            json_response(json!({"code":802,"message":"已扫码，等待确认"}))
        }
        Ok(LoginStatus::QrCodeExpired) => {
            sessions.remove(&key);
            json_response(json!({"code":800,"message":"二维码已过期"}))
        }
        Ok(LoginStatus::Success(token)) => {
            sessions.remove(&key);
            match token {
                LoginToken::Netease(token) => {
                    let cookie = token.to_refresh_cookie();
                    let _ = tokio::fs::write(&state.cookie, &cookie).await;
                    state.cookie_values.write().await.insert("netease", cookie);
                    json_response(
                        json!({"code":803,"message":"登录成功","loggedIn":true,"hasCookie":true,"vipType":0,"vipLevel":"none","isVip":false,"isSvip":false,"vipLabel":"无VIP"}),
                    )
                }
                _ => (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({"error":"UNEXPECTED_LOGIN_PLATFORM"})),
                )
                    .into_response(),
            }
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string()})),
        )
            .into_response(),
    }
}

fn positive_number(value: Option<&Value>) -> u64 {
    match value {
        Some(Value::Number(value)) => value.as_u64().unwrap_or_default(),
        Some(Value::String(value)) => value.parse().unwrap_or_default(),
        Some(Value::Bool(true)) => 1,
        _ => 0,
    }
}

fn value_flag(value: &Value, keys: &[&str]) -> bool {
    keys.iter().any(|key| positive_number(value.get(*key)) > 0)
}

fn collect_strings(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::String(value) if !value.is_empty() => out.push(value.to_lowercase()),
        Value::Array(values) => values.iter().for_each(|value| collect_strings(value, out)),
        Value::Object(values) => values
            .values()
            .for_each(|value| collect_strings(value, out)),
        _ => {}
    }
}

fn collect_vip_strings(value: &Value, out: &mut Vec<String>, depth: usize) {
    if depth > 4 {
        return;
    }
    let Some(object) = value.as_object() else {
        return;
    };
    for (key, value) in object {
        let key = key.to_lowercase();
        if [
            "vip",
            "svip",
            "member",
            "associator",
            "privilege",
            "right",
            "level",
            "package",
            "label",
            "title",
            "type",
        ]
        .iter()
        .any(|part| key.contains(part))
        {
            collect_strings(value, out);
        } else if value.is_object() || value.is_array() {
            collect_vip_strings(value, out, depth + 1);
        }
    }
}

fn normalize_netease_vip(profile: &Value, account: &Value, extra: &Value) -> Value {
    let vip_info = profile
        .get("vipInfo")
        .or_else(|| profile.get("vipinfo"))
        .or_else(|| account.get("vipInfo"))
        .or_else(|| account.get("vipinfo"))
        .or_else(|| extra.get("vipInfo"))
        .or_else(|| extra.get("vipinfo"))
        .unwrap_or(&Value::Null);
    let objects = [account, profile, vip_info, extra];
    let vip_keys = [
        "vipType",
        "vip_type",
        "viptype",
        "musicVipType",
        "music_vip_type",
        "musicVipLevel",
        "music_vip_level",
        "redVipLevel",
        "red_vip_level",
        "blackVipLevel",
        "black_vip_level",
        "luxuryVipLevel",
        "luxury_vip_level",
        "svipType",
        "svip_type",
    ];
    let vip_type = objects
        .iter()
        .find_map(|object| {
            vip_keys
                .iter()
                .map(|key| positive_number(object.get(*key)))
                .find(|value| *value > 0)
        })
        .unwrap_or_default();
    let mut strings = Vec::new();
    collect_vip_strings(extra, &mut strings, 0);
    let text = strings.join(" ");
    let is_svip = objects.iter().any(|object| {
        value_flag(
            object,
            &["isSvip", "is_svip", "svip", "svipType", "svip_type"],
        )
    }) || [
        "svip",
        "supervip",
        "super_vip",
        "blackvip",
        "black_vip",
        "黑胶svip",
        "超级会员",
    ]
    .iter()
    .any(|label| text.contains(label));
    let is_vip = is_svip
        || vip_type > 0
        || objects
            .iter()
            .any(|object| value_flag(object, &["isVip", "is_vip", "vip", "vipFlag", "vipflag"]))
        || ["vip", "黑胶", "会员"]
            .iter()
            .any(|label| text.contains(label));
    let vip_level = if is_svip {
        "svip"
    } else if is_vip {
        "vip"
    } else {
        "none"
    };
    json!({
        "vipType": vip_type,
        "vipLevel": vip_level,
        "isVip": is_vip,
        "isSvip": is_svip,
        "vipLabel": if is_svip { "SVIP" } else if is_vip { "VIP" } else { "无VIP" }
    })
}

fn merge_json(mut base: Value, extra: Value) -> Value {
    if let (Some(base), Some(extra)) = (base.as_object_mut(), extra.as_object()) {
        base.extend(extra.clone());
    }
    base
}

async fn netease_login_info(state: &ApiState) -> Option<Value> {
    let body = ncm(state)
        .login_status()
        .await
        .ok()?
        .deserialize::<Value>()
        .ok()?;
    let data = body.get("data").unwrap_or(&body);
    let profile = data
        .get("profile")
        .or_else(|| body.get("profile"))
        .cloned()
        .unwrap_or_default();
    let account = data
        .get("account")
        .or_else(|| body.get("account"))
        .cloned()
        .unwrap_or_default();
    let user_id = profile
        .get("userId")
        .or_else(|| profile.get("user_id"))
        .or_else(|| profile.get("id"))
        .or_else(|| account.get("userId"))
        .or_else(|| account.get("id"))
        .cloned()
        .unwrap_or_default();
    if user_id.is_null() {
        return None;
    }
    Some(merge_json(
        json!({
            "provider": "netease",
            "loggedIn": true,
            "hasCookie": true,
            "userId": user_id,
            "nickname": profile.get("nickname").or_else(|| profile.get("userName")).cloned().unwrap_or(json!("网易云用户")),
            "avatar": profile.get("avatarUrl").or_else(|| profile.get("avatar")).cloned().unwrap_or_default()
        }),
        normalize_netease_vip(&profile, &account, data),
    ))
}

async fn login_status_netease(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let fallback = login_status_for(state.clone(), "netease").await;
    if state
        .cookie_values
        .read()
        .await
        .get("netease")
        .map(String::is_empty)
        .unwrap_or(true)
    {
        return fallback;
    }
    match netease_login_info(&state).await {
        Some(info) => json_response(info),
        None => fallback,
    }
}
async fn login_status_qq(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let fallback = login_status_for(state.clone(), "qq").await;
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("qq")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uin = qq_uin(&map).to_owned();
    if uin.is_empty() || qq_playback_key(&map).is_empty() {
        return fallback;
    }
    let mut url =
        reqwest::Url::parse("https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg")
            .unwrap();
    for (key, value) in [
        ("cid", "205360838"),
        ("userid", uin.as_str()),
        ("reqfrom", "1"),
        ("g_tk", "5381"),
        ("loginUin", uin.as_str()),
        ("hostUin", "0"),
        ("format", "json"),
        ("inCharset", "utf8"),
        ("outCharset", "utf-8"),
        ("notice", "0"),
        ("platform", "yqq.json"),
        ("needNewCode", "0"),
    ] {
        url.query_pairs_mut().append_pair(key, value);
    }
    let profile = match state
        .http
        .get(url)
        .header(header::COOKIE, &cookie)
        .header(header::REFERER, "https://y.qq.com/portal/profile.html")
        .send()
        .await
    {
        Ok(response) => response.json::<Value>().await.ok(),
        Err(_) => None,
    };
    let Some(body) = profile else {
        return fallback;
    };
    let data = body
        .get("data")
        .or_else(|| body.get("profile"))
        .unwrap_or(&body);
    let user = data
        .get("creator")
        .or_else(|| data.get("user"))
        .or_else(|| data.get("profile"))
        .unwrap_or(data);
    let nickname = user
        .get("nick")
        .or_else(|| user.get("nickname"))
        .or_else(|| user.get("name"))
        .and_then(Value::as_str)
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("QQ 音乐");
    let avatar = user
        .get("headpic")
        .or_else(|| user.get("avatar"))
        .or_else(|| user.get("avatarUrl"))
        .or_else(|| user.get("logo"))
        .and_then(Value::as_str)
        .filter(|url| !url.trim().is_empty())
        .unwrap_or_else(|| "");
    json_response(json!({
        "provider":"qq", "loggedIn":true, "hasCookie":true,
        "userId":uin, "nickname":nickname, "avatar":avatar,
        "playbackKeyReady":!qq_playback_key(&map).is_empty(),
        "profileSource":if avatar.is_empty(){"cookie"}else{"qq-profile"}
    }))
}

async fn qq_login_qr_key(State(state): State<Arc<ApiState>>) -> Response<Body> {
    match state
        .client
        .login()
        .session()
        .platform(Platform::Tencent)
        .send()
        .await
    {
        Ok(session) => {
            let key = uuid::Uuid::new_v4().to_string();
            let img = session.qr_code().to_owned();
            state
                .login_sessions
                .lock()
                .await
                .insert(key.clone(), session);
            json_response(json!({"provider":"qq","key":key,"img":img}))
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"provider":"qq","error":error.to_string()})),
        )
            .into_response(),
    }
}

async fn qq_login_qr_check(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let key = query.get("key").cloned().unwrap_or_default();
    let mut sessions = state.login_sessions.lock().await;
    let Some(session) = sessions.get(&key) else {
        return json_response(json!({"provider":"qq","code":800,"message":"二维码已过期"}));
    };
    match session.status().await {
        Ok(LoginStatus::WaitingScan) => {
            json_response(json!({"provider":"qq","code":801,"message":"等待扫码"}))
        }
        Ok(LoginStatus::WaitingConfirm) => {
            json_response(json!({"provider":"qq","code":802,"message":"已扫码，等待确认"}))
        }
        Ok(LoginStatus::QrCodeExpired) => {
            sessions.remove(&key);
            json_response(json!({"provider":"qq","code":800,"message":"二维码已过期"}))
        }
        Ok(LoginStatus::Success(LoginToken::Tencent(token))) => {
            sessions.remove(&key);
            let cookie = token.to_cookie();
            let map = parse_cookie_map(&cookie);
            let user_id = qq_uin(&map).to_owned();
            let _ = tokio::fs::write(&state.qq_cookie, &cookie).await;
            state.cookie_values.write().await.insert("qq", cookie);
            json_response(json!({
                "provider":"qq", "code":803, "message":"登录成功", "loggedIn":true,
                "hasCookie":true, "playbackKeyReady":true, "userId":user_id,
                "nickname":"QQ 音乐", "avatar":if user_id.is_empty(){String::new()}else{format!("https://q1.qlogo.cn/g?b=qq&nk={user_id}&s=100")}
            }))
        }
        Ok(LoginStatus::Success(_)) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"provider":"qq","error":"UNEXPECTED_LOGIN_PLATFORM"})),
        )
            .into_response(),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"provider":"qq","error":error.to_string()})),
        )
            .into_response(),
    }
}
fn normalize_kugou_membership(body: &Value) -> Value {
    let role = body.get("data").unwrap_or(body);
    let is_vip = positive_number(body.get("errno")) == 0
        && positive_number(body.get("error_code")) == 0
        && positive_number(role.get("vipRemains").or_else(|| role.get("vip_remains"))) > 0
        && positive_number(
            role.get("isExpiredMember")
                .or_else(|| role.get("is_expired_member")),
        ) == 0
        && positive_number(role.get("role")) > 0;
    let vip_type = if is_vip {
        positive_number(
            role.get("user_type")
                .or_else(|| role.get("userType"))
                .or_else(|| role.get("role")),
        )
        .max(1)
    } else {
        0
    };
    json!({
        "vipType": vip_type,
        "vipLevel": if is_vip { "vip" } else { "none" },
        "isVip": is_vip,
        "isSvip": false,
        "vipLabel": if is_vip { "酷狗 VIP" } else { "无 VIP" }
    })
}

async fn kugou_membership(state: &ApiState, cookie: &str) -> Value {
    if cookie.is_empty() {
        return normalize_kugou_membership(&Value::Null);
    }
    let now = unix_millis();
    if let Some((cached_cookie, checked_at, info)) = &*state.kugou_vip_cache.read().await {
        if cached_cookie == cookie && now.saturating_sub(*checked_at) < 5 * 60 * 1000 {
            return info.clone();
        }
    }
    let membership = match state
        .http
        .get("https://vip.kugou.com/recharge/roleinfo")
        .header(header::ACCEPT, "*/*")
        .header(header::COOKIE, cookie)
        .send()
        .await
        .and_then(|response| response.error_for_status())
    {
        Ok(response) => response
            .json::<Value>()
            .await
            .map(|body| normalize_kugou_membership(&body))
            .unwrap_or_else(|_| normalize_kugou_membership(&Value::Null)),
        Err(_) => normalize_kugou_membership(&Value::Null),
    };
    *state.kugou_vip_cache.write().await = Some((cookie.to_owned(), now, membership.clone()));
    membership
}

async fn kugou_login_status_value(state: &ApiState) -> Value {
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let base = login_status_value_for(&cookie, "kugou");
    if !base
        .get("loggedIn")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        return base;
    }
    merge_json(base, kugou_membership(state, &cookie).await)
}

async fn login_status_kugou(State(state): State<Arc<ApiState>>) -> Response<Body> {
    json_response(kugou_login_status_value(&state).await)
}

fn md5_hex(value: &str) -> String {
    format!("{:x}", md5::compute(value.as_bytes()))
}

fn kugou_device(cookie: &str) -> (String, String, String) {
    let map = parse_cookie_map(cookie);
    let guid = map
        .get("KUGOU_API_GUID")
        .copied()
        .unwrap_or_default()
        .to_owned();
    let guid = if guid.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        guid
    };
    let mid = map
        .get("KUGOU_API_MID")
        .or_else(|| map.get("kg_mid"))
        .copied()
        .unwrap_or_default()
        .to_owned();
    let mid = if mid.is_empty() {
        u128::from_str_radix(&md5_hex(&guid), 16)
            .unwrap_or_default()
            .to_string()
    } else {
        mid
    };
    let dfid = map
        .get("dfid")
        .or_else(|| map.get("DFID"))
        .copied()
        .unwrap_or("-")
        .to_owned();
    (guid, mid, dfid)
}

fn append_cookie_pair(cookie: &mut String, key: &str, value: &str) {
    if !cookie.is_empty() {
        cookie.push_str("; ");
    }
    cookie.push_str(key);
    cookie.push('=');
    cookie.push_str(value);
}

fn ensure_kugou_device_cookie(raw: &str) -> String {
    let mut cookie = raw.trim().to_owned();
    let map = parse_cookie_map(&cookie);
    let has_guid = map
        .get("KUGOU_API_GUID")
        .is_some_and(|value| !value.is_empty());
    let has_mid = map
        .get("KUGOU_API_MID")
        .or_else(|| map.get("kg_mid"))
        .is_some_and(|value| !value.is_empty());
    let has_mac = map
        .get("KUGOU_API_MAC")
        .is_some_and(|value| !value.is_empty());
    let has_dev = map
        .get("KUGOU_API_DEV")
        .is_some_and(|value| !value.is_empty());
    drop(map);
    let (guid, mid, _) = kugou_device(&cookie);
    let device_seed = md5_hex(&format!("{guid}:mineradio:kugou"));
    if !has_guid {
        append_cookie_pair(&mut cookie, "KUGOU_API_GUID", &guid);
    }
    if !has_mid {
        append_cookie_pair(&mut cookie, "KUGOU_API_MID", &mid);
    }
    if !has_mac {
        append_cookie_pair(&mut cookie, "KUGOU_API_MAC", &device_seed[..12]);
    }
    if !has_dev {
        append_cookie_pair(&mut cookie, "KUGOU_API_DEV", &device_seed[12..28]);
    }
    cookie
}

fn kugou_play_cookie(cookie: &str) -> String {
    let map = parse_cookie_map(cookie);
    let uid = map
        .get("userid")
        .or_else(|| map.get("user_id"))
        .or_else(|| map.get("uid"))
        .or_else(|| map.get("KugooID"))
        .copied()
        .unwrap_or_default();
    let token = map
        .get("token")
        .or_else(|| map.get("user_token"))
        .or_else(|| map.get("access_token"))
        .or_else(|| map.get("KuGoo"))
        .or_else(|| map.get("t"))
        .copied()
        .unwrap_or_default();
    let (_, mid, _) = kugou_device(cookie);
    format!("userid={uid}; token={token}; KUGOU_API_MID={mid}")
}

fn kugou_playable_url(body: &Value) -> String {
    let data = body.get("data").unwrap_or(body);
    for key in ["play_url", "play_backup_url", "url", "src", "backup_url"] {
        let Some(value) = data.get(key) else {
            continue;
        };
        if let Some(url) = value.as_str().filter(|url| !url.trim().is_empty()) {
            return url.to_owned();
        }
        if let Some(url) = value
            .as_array()
            .and_then(|items| items.iter().find_map(Value::as_str))
            .filter(|url| !url.trim().is_empty())
        {
            return url.to_owned();
        }
    }
    String::new()
}

async fn ensure_kugou_device_state(state: &ApiState) {
    let current = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let enriched = ensure_kugou_device_cookie(&current);
    if enriched == current {
        return;
    }
    let _ = tokio::fs::write(&state.kugou_cookie, &enriched).await;
    state.cookie_values.write().await.insert("kugou", enriched);
}

fn kugou_web_signature(params: &HashMap<String, String>) -> String {
    let mut pairs = params.iter().collect::<Vec<_>>();
    pairs.sort_by_key(|(key, _)| *key);
    let body = pairs
        .into_iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<String>();
    md5_hex(&format!(
        "NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt{body}NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt"
    ))
}

async fn kugou_gateway(
    state: &ApiState,
    base: &str,
    path: &str,
    mut params: HashMap<String, String>,
    web: bool,
    method: reqwest::Method,
    body: Option<Value>,
    router: &str,
) -> Result<Value, String> {
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let (_, mid, dfid) = kugou_device(&cookie);
    params.entry("dfid".into()).or_insert(dfid.clone());
    params.entry("mid".into()).or_insert(mid.clone());
    params.entry("uuid".into()).or_insert("-".into());
    params.entry("appid".into()).or_insert("3116".into());
    params.entry("clientver".into()).or_insert("11440".into());
    params
        .entry("clienttime".into())
        .or_insert((unix_millis() / 1000).to_string());
    let body_text = body.as_ref().map(Value::to_string).unwrap_or_default();
    let signature = if web {
        kugou_web_signature(&params)
    } else {
        let mut pairs = params.iter().collect::<Vec<_>>();
        pairs.sort_by_key(|(k, _)| *k);
        let content = pairs
            .into_iter()
            .map(|(k, v)| format!("{k}={v}"))
            .collect::<String>();
        md5_hex(&format!(
            "LnT6xpN3khm36zse0QzvmgTZ3waWdRSA{content}{body_text}LnT6xpN3khm36zse0QzvmgTZ3waWdRSA"
        ))
    };
    params.insert("signature".into(), signature);
    let mut url = reqwest::Url::parse(&format!("{base}{path}")).map_err(|e| e.to_string())?;
    url.query_pairs_mut().extend_pairs(params.iter());
    let mut request = state
        .http
        .request(method, url)
        .header(
            header::USER_AGENT,
            if web {
                USER_AGENT
            } else {
                "Android15-1070-11440-46-0-DiscoveryDRADProtocol-wifi"
            },
        )
        .header("x-router", router)
        .header("mid", mid)
        .header("dfid", dfid);
    if !web {
        request = request
            .header("kg-rc", "1")
            .header("kg-thash", "5d816a0")
            .header("kg-rec", "1")
            .header("kg-rf", "B9EDA08A64250DEFFBCADDEE00F8F25F");
    }
    if !cookie.is_empty() {
        request = request.header(header::COOKIE, cookie);
    }
    if body.is_some() {
        request = request
            .header(header::CONTENT_TYPE, "application/json")
            .body(body_text);
    }
    request
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json::<Value>()
        .await
        .map_err(|e| e.to_string())
}

async fn kugou_login_qr_key(State(state): State<Arc<ApiState>>) -> Response<Body> {
    ensure_kugou_device_state(&state).await;
    let mut params = HashMap::new();
    params.insert("appid".into(), "1001".into());
    params.insert("type".into(), "1".into());
    params.insert("plat".into(), "4".into());
    params.insert(
        "qrcode_txt".into(),
        "https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=3116&".into(),
    );
    params.insert("srcappid".into(), "2919".into());
    match kugou_gateway(
        &state,
        "https://login-user.kugou.com",
        "/v2/qrcode",
        params,
        true,
        reqwest::Method::GET,
        None,
        "login-user.kugou.com",
    )
    .await
    {
        Ok(body) => {
            let key = body
                .pointer("/data/qrcode")
                .or_else(|| body.get("qrcode"))
                .or_else(|| body.get("key"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            if key.is_empty() {
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({"error":"KUGOU_QR_KEY_FAILED","body":body})),
                )
                    .into_response();
            }
            let url = format!("https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode={key}");
            let img = qrcode::QrCode::new(url.as_bytes())
                .map(|code| {
                    code.render::<qrcode::render::svg::Color>()
                        .min_dimensions(220, 220)
                        .build()
                })
                .unwrap_or_default();
            let data_url = format!(
                "data:image/svg+xml;base64,{}",
                base64::engine::general_purpose::STANDARD.encode(img)
            );
            json_response(
                json!({"provider":"kugou","key":key,"qrcode":key,"url":url,"img":data_url}),
            )
        }
        Err(error) => (StatusCode::BAD_GATEWAY, Json(json!({"error":error}))).into_response(),
    }
}

async fn kugou_login_qr_check(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let key = query.get("key").cloned().unwrap_or_default();
    let mut params = HashMap::new();
    params.insert("plat".into(), "4".into());
    params.insert("appid".into(), "3116".into());
    params.insert("srcappid".into(), "2919".into());
    params.insert("qrcode".into(), key);
    match kugou_gateway(
        &state,
        "https://login-user.kugou.com",
        "/v2/get_userinfo_qrcode",
        params,
        true,
        reqwest::Method::GET,
        None,
        "login-user.kugou.com",
    )
    .await
    {
        Ok(body) => {
            let data = body.get("data").unwrap_or(&body);
            let status = data
                .get("status")
                .and_then(Value::as_i64)
                .unwrap_or_default();
            let token = data
                .get("token")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let uid = data
                .get("userid")
                .and_then(|v| {
                    v.as_str()
                        .map(str::to_owned)
                        .or_else(|| v.as_u64().map(|n| n.to_string()))
                })
                .unwrap_or_default();
            if token.is_empty() || uid.is_empty() {
                let code = match status {
                    2 => 802,
                    3 => 800,
                    _ => 801,
                };
                return json_response(
                    json!({"provider":"kugou","loggedIn":false,"code":code,"status":status,"message":body.get("message").or_else(||body.get("msg"))}),
                );
            }
            let nickname = data
                .get("nickname")
                .or_else(|| data.get("username"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            let avatar = data
                .get("pic")
                .or_else(|| data.get("avatar"))
                .and_then(Value::as_str)
                .unwrap_or_default();
            let existing = state
                .cookie_values
                .read()
                .await
                .get("kugou")
                .cloned()
                .unwrap_or_default();
            let (guid, mid, _) = kugou_device(&existing);
            let nickname_cookie = utf8_percent_encode(nickname, NON_ALPHANUMERIC).to_string();
            let avatar_cookie = utf8_percent_encode(avatar, NON_ALPHANUMERIC).to_string();
            let qr_vip_type = positive_number(
                data.get("vip_type")
                    .or_else(|| data.get("vipType"))
                    .or_else(|| data.get("viptype")),
            );
            let cookie = ensure_kugou_device_cookie(&format!(
                "userid={uid}; token={token}; nickname={nickname_cookie}; avatar={avatar_cookie}; vipType={qr_vip_type}; KUGOU_API_GUID={guid}; KUGOU_API_MID={mid}"
            ));
            let _ = tokio::fs::write(&state.kugou_cookie, &cookie).await;
            state
                .cookie_values
                .write()
                .await
                .insert("kugou", cookie.clone());
            let membership = kugou_membership(&state, &cookie).await;
            json_response(merge_json(
                json!({"provider":"kugou","loggedIn":true,"code":803,"status":status,"saved":true,"userId":uid,"nickname":nickname,"avatar":avatar}),
                membership,
            ))
        }
        Err(error) => (StatusCode::BAD_GATEWAY, Json(json!({"error":error}))).into_response(),
    }
}

async fn kugou_user_playlists(State(state): State<Arc<ApiState>>) -> Response<Body> {
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uid = map
        .get("userid")
        .or_else(|| map.get("user_id"))
        .or_else(|| map.get("uid"))
        .or_else(|| map.get("KugooID"))
        .or_else(|| map.get("kugou_id"))
        .or_else(|| map.get("kugouid"))
        .or_else(|| map.get("kg_uid"))
        .copied()
        .unwrap_or_default();
    let token = map
        .get("token")
        .or_else(|| map.get("user_token"))
        .or_else(|| map.get("access_token"))
        .or_else(|| map.get("key"))
        .or_else(|| map.get("KuGoo"))
        .or_else(|| map.get("t"))
        .copied()
        .unwrap_or_default();
    if uid.is_empty() || token.is_empty() {
        return json_response(json!({"loggedIn":false,"provider":"kugou","playlists":[]}));
    }
    let mut params = HashMap::new();
    for (k, v) in [
        ("total_ver", "979"),
        ("type", "2"),
        ("page", "1"),
        ("pagesize", "200"),
        ("userid", uid),
        ("token", token),
    ] {
        params.insert(k.into(), v.into());
    }
    let body = json!({"total_ver":979,"type":2,"page":1,"pagesize":200,"userid":uid,"token":token});
    match kugou_gateway(
        &state,
        "https://gateway.kugou.com",
        "/v7/get_all_list",
        params,
        false,
        reqwest::Method::POST,
        Some(body),
        "cloudlist.service.kugou.com",
    )
    .await
    {
        Ok(body) => {
            let raw = find_array(
                &body,
                &[
                    "lists",
                    "list",
                    "info",
                    "listinfo",
                    "collection_list",
                    "playlist",
                ],
            );
            json_response(
                json!({"loggedIn":true,"provider":"kugou","userId":uid,"playlists":raw.into_iter().map(map_kugou_playlist).collect::<Vec<_>>()}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error,"loggedIn":true,"provider":"kugou","playlists":[]})),
        )
            .into_response(),
    }
}

async fn kugou_playlist_tracks(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("id")
        .or_else(|| query.get("listid"))
        .cloned()
        .unwrap_or_default();
    if id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing Kugou playlist id","tracks":[]})),
        )
            .into_response();
    }
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uid = map
        .get("userid")
        .or_else(|| map.get("user_id"))
        .or_else(|| map.get("uid"))
        .or_else(|| map.get("KugooID"))
        .copied()
        .unwrap_or_default()
        .to_owned();
    let token = map
        .get("token")
        .or_else(|| map.get("user_token"))
        .or_else(|| map.get("access_token"))
        .or_else(|| map.get("KuGoo"))
        .or_else(|| map.get("t"))
        .copied()
        .unwrap_or_default()
        .to_owned();
    if uid.is_empty() || token.is_empty() {
        return json_response(json!({"loggedIn":false,"provider":"kugou","tracks":[]}));
    }
    let (mut all_tracks, last_body) =
        match kugou_playlist_raw_tracks(&state, &id, &uid, &token).await {
            Ok(result) => result,
            Err(error) => {
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({"error":error,"tracks":[]})),
                )
                    .into_response();
            }
        };
    all_tracks.sort_by_key(|track| {
        let position = first_kugou_number(track, &["fsort", "sort", "position", "pos"]);
        if position > 0 {
            position
        } else {
            first_kugou_number(track, &["collecttime", "collect_time"])
        }
    });
    let tracks = all_tracks
        .into_iter()
        .map(map_kugou_track)
        .filter(|track| {
            !track
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .is_empty()
                && !track.get("hash").unwrap_or(&Value::Null).is_null()
        })
        .collect::<Vec<_>>();
    json_response(
        json!({"loggedIn":true,"provider":"kugou","playlist":{"provider":"kugou","id":id,"name":last_body.pointer("/data/info/listname").or_else(||last_body.pointer("/data/listname")),"trackCount":tracks.len()},"tracks":tracks}),
    )
}

async fn kugou_playlist_raw_tracks(
    state: &ApiState,
    id: &str,
    uid: &str,
    token: &str,
) -> Result<(Vec<Value>, Value), String> {
    let mut all_tracks = Vec::new();
    let mut last_body = Value::Null;
    for page in 1..=10 {
        let mut params = HashMap::new();
        for (key, value) in [
            ("listid", id.to_owned()),
            ("page", page.to_string()),
            ("pagesize", "200".into()),
            ("userid", uid.to_owned()),
            ("token", token.to_owned()),
        ] {
            params.insert(key.into(), value);
        }
        let request_body = json!({
            "listid":id, "page":page, "pagesize":200, "area_code":1,
            "show_relate_goods":0, "allplatform":1, "show_cover":1, "type":0,
            "userid":uid.parse::<u64>().map(Value::from).unwrap_or_else(|_|Value::String(uid.to_owned())),
            "token":token
        });
        match kugou_gateway(
            &state,
            "https://gateway.kugou.com",
            "/v4/get_list_all_file",
            params,
            false,
            reqwest::Method::POST,
            Some(request_body),
            "cloudlist.service.kugou.com",
        )
        .await
        {
            Ok(body) => {
                let page_tracks =
                    find_array(&body, &["songs", "songlist", "list", "info", "files"]);
                let total = body
                    .pointer("/data/count")
                    .or_else(|| body.pointer("/data/total"))
                    .and_then(Value::as_u64)
                    .unwrap_or_default() as usize;
                last_body = body;
                let count = page_tracks.len();
                all_tracks.extend(page_tracks);
                if count == 0 || count < 200 || (total > 0 && all_tracks.len() >= total) {
                    break;
                }
            }
            Err(error) => {
                if all_tracks.is_empty() {
                    return Err(error);
                }
                break;
            }
        }
    }
    Ok((all_tracks, last_body))
}

async fn kugou_auth_credentials(state: &ApiState) -> (String, String) {
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let map = parse_cookie_map(&cookie);
    let uid = map
        .get("userid")
        .or_else(|| map.get("user_id"))
        .or_else(|| map.get("uid"))
        .or_else(|| map.get("KugooID"))
        .copied()
        .unwrap_or_default()
        .to_owned();
    let token = map
        .get("token")
        .or_else(|| map.get("user_token"))
        .or_else(|| map.get("access_token"))
        .or_else(|| map.get("KuGoo"))
        .or_else(|| map.get("t"))
        .copied()
        .unwrap_or_default()
        .to_owned();
    (uid, token)
}

fn kugou_add_song_body(
    uid: &str,
    token: &str,
    hash: &str,
    name: &str,
    album_id: u64,
    mixsongid: u64,
) -> Value {
    json!({
        "userid":uid.parse::<u64>().map(Value::from).unwrap_or_else(|_|Value::String(uid.to_owned())),
        "token":token,
        "listid":2,
        "list_ver":0,
        "type":0,
        "slow_upload":1,
        "scene":"false;null",
        "data":[{
            "number":1, "name":name, "hash":hash, "size":0, "sort":0,
            "timelen":0, "bitrate":0, "album_id":album_id, "mixsongid":mixsongid
        }]
    })
}

fn kugou_delete_song_body(uid: &str, token: &str, file_id: u64) -> Value {
    json!({
        "listid":2,
        "userid":uid.parse::<u64>().map(Value::from).unwrap_or_else(|_|Value::String(uid.to_owned())),
        "data":[{"fileid":file_id}],
        "type":0,
        "token":token,
        "list_ver":0
    })
}

fn kugou_operation_succeeded(body: &Value) -> bool {
    body.get("status").and_then(Value::as_i64) == Some(1)
        || body.get("code").and_then(Value::as_i64) == Some(0)
        || body.get("error_code").and_then(Value::as_i64) == Some(0) && body.get("data").is_some()
}

async fn kugou_song_like_check(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let ids = query
        .get("ids")
        .or_else(|| query.get("id"))
        .cloned()
        .unwrap_or_default()
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    let (uid, token) = kugou_auth_credentials(&state).await;
    if uid.is_empty() || token.is_empty() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"provider":"kugou","loggedIn":false,"liked":{}})),
        )
            .into_response();
    }
    let (tracks, _) = match kugou_playlist_raw_tracks(&state, "2", &uid, &token).await {
        Ok(result) => result,
        Err(error) => {
            return (StatusCode::BAD_GATEWAY, Json(json!({"error":error}))).into_response();
        }
    };
    let mut liked_file_ids = HashMap::new();
    for track in tracks {
        let mapped = map_kugou_track(track);
        let hash = mapped
            .get("hash")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_uppercase();
        if !hash.is_empty() {
            liked_file_ids.insert(hash, mapped.get("fileId").cloned().unwrap_or(Value::Null));
        }
    }
    let liked = ids
        .iter()
        .map(|id| {
            (
                id.clone(),
                Value::Bool(liked_file_ids.contains_key(&id.to_uppercase())),
            )
        })
        .collect::<serde_json::Map<_, _>>();
    let file_ids = ids
        .iter()
        .filter_map(|id| {
            liked_file_ids
                .get(&id.to_uppercase())
                .filter(|value| !value.is_null())
                .map(|value| (id.clone(), value.clone()))
        })
        .collect::<serde_json::Map<_, _>>();
    json_response(json!({
        "provider":"kugou", "loggedIn":true, "ids":ids,
        "liked":liked, "fileIds":file_ids
    }))
}

async fn kugou_song_like(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    request: Request,
) -> Response<Body> {
    let (uid, token) = kugou_auth_credentials(&state).await;
    if uid.is_empty() || token.is_empty() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"provider":"kugou","loggedIn":false,"error":"LOGIN_REQUIRED"})),
        )
            .into_response();
    }
    let body = request_json(request).await;
    let text_value = |key: &str| {
        body.get(key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .or_else(|| query.get(key).cloned())
            .unwrap_or_default()
    };
    let hash = text_value("hash").to_uppercase();
    if hash.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"provider":"kugou","error":"MISSING_HASH"})),
        )
            .into_response();
    }
    let liked = body
        .get("like")
        .and_then(Value::as_bool)
        .or_else(|| query.get("like").map(|value| value != "false"))
        .unwrap_or(true);
    let number_value = |camel: &str, snake: &str| {
        body.get(camel)
            .or_else(|| body.get(snake))
            .and_then(|value| value.as_u64().or_else(|| value.as_str()?.parse().ok()))
            .or_else(|| query.get(camel).and_then(|value| value.parse().ok()))
            .unwrap_or_default()
    };
    let response = if liked {
        let name = text_value("name");
        let mut params = HashMap::new();
        params.insert("last_time".into(), (unix_millis() / 1000).to_string());
        params.insert("last_area".into(), "gztx".into());
        params.insert("userid".into(), uid.clone());
        params.insert("token".into(), token.clone());
        kugou_gateway(
            &state,
            "https://gateway.kugou.com",
            "/cloudlist.service/v6/add_song",
            params,
            false,
            reqwest::Method::POST,
            Some(kugou_add_song_body(
                &uid,
                &token,
                &hash,
                if name.is_empty() { &hash } else { &name },
                number_value("albumId", "album_id"),
                number_value("albumAudioId", "album_audio_id"),
            )),
            "cloudlist.service.kugou.com",
        )
        .await
    } else {
        let mut file_id = number_value("fileId", "file_id");
        if file_id == 0 {
            if let Ok((tracks, _)) = kugou_playlist_raw_tracks(&state, "2", &uid, &token).await {
                file_id = tracks
                    .into_iter()
                    .map(map_kugou_track)
                    .find(|track| {
                        track
                            .get("hash")
                            .and_then(Value::as_str)
                            .map(str::to_uppercase)
                            == Some(hash.clone())
                    })
                    .and_then(|track| {
                        track.get("fileId").and_then(|value| {
                            value.as_u64().or_else(|| value.as_str()?.parse().ok())
                        })
                    })
                    .unwrap_or_default();
            }
        }
        if file_id == 0 {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({"provider":"kugou","error":"LIKED_SONG_FILE_ID_NOT_FOUND"})),
            )
                .into_response();
        }
        kugou_gateway(
            &state,
            "https://gateway.kugou.com",
            "/v4/delete_songs",
            HashMap::new(),
            false,
            reqwest::Method::POST,
            Some(kugou_delete_song_body(&uid, &token, file_id)),
            "cloudlist.service.kugou.com",
        )
        .await
    };
    match response {
        Ok(upstream) => {
            let success = kugou_operation_succeeded(&upstream);
            json_response(json!({
                "provider":"kugou", "loggedIn":true, "hash":hash,
                "liked":liked, "success":success, "body":upstream
            }))
        }
        Err(error) => (StatusCode::BAD_GATEWAY, Json(json!({"error":error}))).into_response(),
    }
}

async fn kugou_song_url(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let original_hash = query
        .get("hash")
        .cloned()
        .unwrap_or_default()
        .to_uppercase();
    if original_hash.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"provider":"kugou","url":"","playable":false,"error":"Missing Kugou hash"}),
            ),
        )
            .into_response();
    }
    let requested_quality = query.get("quality").map(String::as_str).unwrap_or("hires");
    let quality_hashes = query
        .get("qualityHashes")
        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
        .unwrap_or_default();
    let quality_order: &[&str] = match requested_quality {
        "jymaster" => &["jymaster", "hires", "lossless", "exhigh", "standard"],
        "hires" => &["hires", "lossless", "exhigh", "standard"],
        "lossless" => &["lossless", "exhigh", "standard"],
        "exhigh" => &["exhigh", "standard"],
        _ => &["standard"],
    };
    let selected = quality_order.iter().find_map(|level| {
        quality_hashes
            .get(*level)
            .and_then(Value::as_str)
            .filter(|hash| !hash.trim().is_empty())
            .map(|hash| ((*level).to_owned(), hash.trim().to_uppercase()))
    });
    let (resolved_level, hash) =
        selected.unwrap_or_else(|| (requested_quality.to_owned(), original_hash.clone()));
    let cookie = state
        .cookie_values
        .read()
        .await
        .get("kugou")
        .cloned()
        .unwrap_or_default();
    let membership = kugou_membership(&state, &cookie).await;
    let map = parse_cookie_map(&cookie);
    let uid = map
        .get("userid")
        .or_else(|| map.get("user_id"))
        .or_else(|| map.get("uid"))
        .or_else(|| map.get("KugooID"))
        .copied()
        .unwrap_or("0");
    let token = map
        .get("token")
        .or_else(|| map.get("user_token"))
        .or_else(|| map.get("access_token"))
        .or_else(|| map.get("KuGoo"))
        .or_else(|| map.get("t"))
        .copied()
        .unwrap_or("0");
    let cookie_vip_type = map
        .get("vip_type")
        .or_else(|| map.get("vipType"))
        .or_else(|| map.get("viptype"))
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or_default();
    let vip_type = positive_number(membership.get("vipType")).max(cookie_vip_type);
    let vip_type_text = vip_type.to_string();
    let (_, mid, _) = kugou_device(&cookie);
    let key = md5_hex(&format!("{hash}kgcloudv23116{mid}{uid}"));
    let mut url = reqwest::Url::parse("https://trackercdn.kugou.com/i/v2/").unwrap();
    for (k, v) in [
        ("cmd", "26"),
        ("hash", hash.as_str()),
        ("behavior", "play"),
        ("appid", "3116"),
        ("pid", "2"),
        ("mid", mid.as_str()),
        ("userid", uid),
        ("version", "11440"),
        ("vipType", vip_type_text.as_str()),
        ("token", token),
        ("key", key.as_str()),
    ] {
        url.query_pairs_mut().append_pair(k, v);
    }
    if let Some(v) = query.get("albumAudioId") {
        url.query_pairs_mut().append_pair("album_audio_id", v);
    }
    if let Some(v) = query.get("albumId") {
        url.query_pairs_mut().append_pair("album_id", v);
    }
    let play_cookie = kugou_play_cookie(&cookie);
    match state
        .http
        .get(url)
        .header(
            header::USER_AGENT,
            "Android15-1070-11440-46-0-DiscoveryDRADProtocol-wifi",
        )
        .header(header::COOKIE, play_cookie)
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(response) => match response.text().await {
            Ok(text) => {
                let clean = text
                    .replace("<!--KG_TAG_RES_START-->", "")
                    .replace("<!--KG_TAG_RES_END-->", "");
                let body = serde_json::from_str::<Value>(clean.trim()).unwrap_or_default();
                let play = kugou_playable_url(&body);
                json_response(merge_json(
                    json!({"provider":"kugou","url":play,"playable":!play.is_empty(),"loggedIn":uid!="0","vipType":vip_type,"level":resolved_level,"requestedQuality":requested_quality,"resolvedHash":hash,"trial":false,"message":if play.is_empty(){if uid=="0"{"酷狗歌曲需要登录后获取播放地址"}else{"酷狗没有返回当前账号可播放地址，可能需要会员、购买或官方客户端权限"}}else{""},"reason":if play.is_empty(){if uid=="0"{"login_required"}else{"paid_required"}}else{""},"kugouCode":body.get("error_code").or_else(||body.get("errcode")).or_else(||body.get("status"))}),
                    membership,
                ))
            }
            Err(error) => (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error":error.to_string(),"playable":false})),
            )
                .into_response(),
        },
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"playable":false})),
        )
            .into_response(),
    }
}

async fn kugou_lyric(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let hash = query
        .get("hash")
        .cloned()
        .unwrap_or_default()
        .to_uppercase();
    if hash.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"provider":"kugou","error":"Missing Kugou hash","lyric":""})),
        )
            .into_response();
    }
    let mut search = reqwest::Url::parse("http://lyrics.kugou.com/search").unwrap();
    search
        .query_pairs_mut()
        .append_pair("ver", "1")
        .append_pair("man", "yes")
        .append_pair("client", "pc")
        .append_pair("hash", &hash);
    if let Some(v) = query.get("duration") {
        search.query_pairs_mut().append_pair("duration", v);
    }
    let search_body = match state
        .http
        .get(search)
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(r) => r.json::<Value>().await.unwrap_or_default(),
        Err(error) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(json!({"error":error.to_string(),"lyric":""})),
            )
                .into_response()
        }
    };
    let first = search_body
        .get("candidates")
        .and_then(Value::as_array)
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or_default();
    let id = first.get("id").and_then(Value::as_str).unwrap_or_default();
    let access = first
        .get("accesskey")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if id.is_empty() {
        return json_response(
            json!({"provider":"kugou","lyric":"","tlyric":"","yrc":"","source":"kugou-empty"}),
        );
    }
    let mut download = reqwest::Url::parse("http://lyrics.kugou.com/download").unwrap();
    for (k, v) in [
        ("ver", "1"),
        ("client", "pc"),
        ("id", id),
        ("accesskey", access),
        ("fmt", "lrc"),
        ("charset", "utf8"),
    ] {
        download.query_pairs_mut().append_pair(k, v);
    }
    match state
        .http
        .get(download)
        .send()
        .await
        .and_then(|r| r.error_for_status())
    {
        Ok(r) => {
            let body = r.json::<Value>().await.unwrap_or_default();
            let raw = body
                .get("content")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let lyric = base64::engine::general_purpose::STANDARD
                .decode(raw.replace(char::is_whitespace, ""))
                .ok()
                .and_then(|b| String::from_utf8(b).ok())
                .unwrap_or_else(|| raw.to_owned());
            json_response(
                json!({"provider":"kugou","hash":hash,"lyric":lyric,"tlyric":"","yrc":"","source":if raw.is_empty(){"kugou-empty"}else{"kugou-lyrics"}}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"lyric":""})),
        )
            .into_response(),
    }
}

fn find_array(value: &Value, keys: &[&str]) -> Vec<Value> {
    if let Some(a) = value.as_array() {
        return a.clone();
    }
    if let Some(o) = value.as_object() {
        for key in keys {
            if let Some(a) = o.get(*key).and_then(Value::as_array) {
                return a.clone();
            }
        }
        for child in o.values() {
            let found = find_array(child, keys);
            if !found.is_empty() {
                return found;
            }
        }
    }
    Vec::new()
}
fn map_kugou_playlist(p: Value) -> Value {
    let id = first_kugou_text(
        &p,
        &[
            "listid",
            "list_id",
            "global_collection_id",
            "specialid",
            "id",
            "mixsongid",
        ],
    );
    let name = first_kugou_text(
        &p,
        &[
            "name",
            "listname",
            "list_name",
            "specialname",
            "title",
            "collection_name",
        ],
    );
    let cover = first_kugou_text(
        &p,
        &["pic", "img", "cover", "sizable_cover", "list_pic", "avatar"],
    )
    .replace("{size}", "240");
    let track_count = first_kugou_number(
        &p,
        &["count", "song_count", "total", "file_count", "songcount"],
    );
    let creator = first_kugou_text(&p, &["username", "nickname", "user_name"]);
    json!({
        "provider":"kugou", "source":"kugou", "type":"kugou", "id":id,
        "name":if name.is_empty(){"酷狗歌单"}else{&name}, "cover":cover,
        "trackCount":track_count, "creator":if creator.is_empty(){"酷狗音乐"}else{&creator}
    })
}

fn kugou_value_text(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        _ => String::new(),
    }
}

fn first_kugou_text(value: &Value, keys: &[&str]) -> String {
    keys.iter()
        .find_map(|key| {
            let text = kugou_value_text(value.get(*key));
            (!text.is_empty()).then_some(text)
        })
        .unwrap_or_default()
}

fn first_kugou_number(value: &Value, keys: &[&str]) -> u64 {
    keys.iter()
        .map(|key| positive_number(value.get(*key)))
        .find(|value| *value > 0)
        .unwrap_or_default()
}

fn clean_kugou_track_text(value: &str) -> String {
    let mut text = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let lower = text.to_lowercase();
    if let Some(extension) = [".mp3", ".flac", ".m4a", ".aac", ".ogg", ".wav"]
        .iter()
        .find(|extension| lower.ends_with(**extension))
    {
        text.truncate(text.len() - extension.len());
        text = text.trim().to_owned();
    }
    text
}

fn comparable_kugou_title(value: &str) -> String {
    clean_kugou_track_text(value)
        .to_lowercase()
        .split_whitespace()
        .collect()
}

fn map_kugou_track(p: Value) -> Value {
    let trans = p
        .get("trans_param")
        .or_else(|| p.get("transParam"))
        .unwrap_or(&Value::Null);
    let hash = first_kugou_text(
        &p,
        &[
            "hash",
            "Hash",
            "file_hash",
            "FileHash",
            "audio_hash",
            "320hash",
            "128hash",
            "sqhash",
            "SQFileHash",
            "HQFileHash",
        ],
    );
    let hash = if hash.is_empty() {
        first_kugou_text(trans, &["ogg_320_hash", "ogg_128_hash"])
    } else {
        hash
    };
    let quality_hash = |keys: &[&str], trans_keys: &[&str]| {
        let value = first_kugou_text(&p, keys);
        if !value.is_empty() {
            value
        } else {
            let value = first_kugou_text(trans, trans_keys);
            if value.is_empty() {
                hash.clone()
            } else {
                value
            }
        }
    };
    let filename = clean_kugou_track_text(&first_kugou_text(&p, &["filename", "FileName"]));
    let mut name = clean_kugou_track_text(&first_kugou_text(
        &p,
        &["songname", "song_name", "name", "title"],
    ));
    let mut artist = clean_kugou_track_text(&first_kugou_text(
        &p,
        &[
            "singername",
            "singer_name",
            "author_name",
            "singer",
            "artist",
        ],
    ));
    if artist.is_empty() {
        artist = p
            .get("singerinfo")
            .and_then(Value::as_array)
            .map(|singers| {
                singers
                    .iter()
                    .map(|singer| clean_kugou_track_text(&first_kugou_text(singer, &["name"])))
                    .filter(|name| !name.is_empty())
                    .collect::<Vec<_>>()
                    .join(" / ")
            })
            .unwrap_or_default();
    }
    if let Some((filename_artist, filename_title)) = filename.split_once(" - ") {
        if artist.is_empty() {
            artist = clean_kugou_track_text(filename_artist);
        }
        if name.is_empty() || comparable_kugou_title(&name) == comparable_kugou_title(&filename) {
            name = clean_kugou_track_text(filename_title);
        }
    } else if name.is_empty() {
        name = filename;
    }
    if let Some((name_artist, name_title)) = name.split_once(" - ") {
        if !artist.is_empty()
            && comparable_kugou_title(name_artist) == comparable_kugou_title(&artist)
        {
            name = clean_kugou_track_text(name_title);
        }
    }
    let album_info = p
        .get("albuminfo")
        .or_else(|| p.get("albumInfo"))
        .unwrap_or(&Value::Null);
    let mut album = first_kugou_text(&p, &["album_name", "albumname", "album"]);
    if album.is_empty() {
        album = first_kugou_text(album_info, &["name"]);
    }
    let cover = {
        let value = first_kugou_text(&p, &["pic", "img", "image", "cover", "sizable_cover"]);
        if value.is_empty() {
            first_kugou_text(trans, &["union_cover"])
        } else {
            value
        }
    }
    .replace("{size}", "300");
    let duration = first_kugou_number(
        &p,
        &[
            "timelength",
            "time_length",
            "timelen",
            "duration",
            "interval",
        ],
    );
    let duration = if duration > 0 && duration <= 1000 {
        duration * 1000
    } else {
        duration
    };
    let fsort = first_kugou_number(&p, &["fsort", "sort", "position", "pos"]);
    let album_audio_id = first_kugou_text(
        &p,
        &[
            "album_audio_id",
            "albumAudioId",
            "audio_id",
            "audioid",
            "Audioid",
            "mixsongid",
            "songid",
            "id",
        ],
    );
    let album_id = first_kugou_text(&p, &["album_id", "albumid", "AlbumID", "albumId"]);
    let file_id = first_kugou_text(&p, &["fileid", "file_id", "FileID", "fileId"]);
    let fee = first_kugou_number(
        &p,
        &["privilege", "media_privilege", "media_pay_type", "pay_type"],
    );
    json!({
        "provider":"kugou", "source":"kugou", "type":"kugou",
        "id":if hash.is_empty(){if album_audio_id.is_empty(){name.clone()}else{album_audio_id.clone()}}else{hash.clone()},
        "hash":hash,
        "qualityHashes":{
            "standard":quality_hash(&["128hash", "hash", "Hash", "file_hash"], &["ogg_128_hash"]),
            "exhigh":quality_hash(&["320hash", "HQFileHash", "hash", "Hash", "file_hash"], &["ogg_320_hash"]),
            "lossless":quality_hash(&["sqhash", "SQFileHash", "flac_hash", "hash", "Hash", "file_hash"], &[]),
            "hires":quality_hash(&["hrhash", "high_hash", "sqhash", "SQFileHash", "hash", "Hash", "file_hash"], &[]),
            "jymaster":quality_hash(&["masterhash", "jymaster_hash", "hrhash", "sqhash", "SQFileHash", "hash", "Hash", "file_hash"], &[])
        },
        "albumAudioId":album_audio_id, "albumId":album_id, "fileId":file_id,
        "name":name.trim_end_matches('-').trim(), "artist":artist,
        "artists":if artist.is_empty(){Vec::<Value>::new()}else{vec![json!({"name":artist})]},
        "album":album, "cover":cover, "duration":duration, "fee":fee,
        "fsort":fsort, "position":fsort, "sort":fsort, "playable":!hash.is_empty()
    })
}

async fn request_json(request: Request) -> Value {
    let bytes = axum::body::to_bytes(request.into_body(), 2 * 1024 * 1024)
        .await
        .unwrap_or_default();
    serde_json::from_slice(&bytes).unwrap_or_else(|_| json!({}))
}

async fn save_cookie_for(
    state: Arc<ApiState>,
    service: &'static str,
    request: Request,
) -> Response<Body> {
    let body = request_json(request).await;
    let cookie = body
        .get("cookie")
        .or_else(|| body.get("data"))
        .or_else(|| body.get("text"))
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_owned();
    let cookie = if service == "kugou" {
        ensure_kugou_device_cookie(&cookie)
    } else {
        cookie
    };
    let path = match service {
        "netease" => &state.cookie,
        "qq" => &state.qq_cookie,
        _ => &state.kugou_cookie,
    };
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    if let Err(error) = tokio::fs::write(path, &cookie).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error":error.to_string()})),
        )
            .into_response();
    }
    state.cookie_values.write().await.insert(service, cookie);
    match service {
        "netease" => login_status_netease(State(state)).await,
        "kugou" => login_status_kugou(State(state)).await,
        _ => login_status_for(state, service).await,
    }
}

async fn save_netease_cookie(
    State(state): State<Arc<ApiState>>,
    request: Request,
) -> Response<Body> {
    save_cookie_for(state, "netease", request).await
}
async fn save_qq_cookie(State(state): State<Arc<ApiState>>, request: Request) -> Response<Body> {
    save_cookie_for(state, "qq", request).await
}
async fn save_kugou_cookie(State(state): State<Arc<ApiState>>, request: Request) -> Response<Body> {
    save_cookie_for(state, "kugou", request).await
}

async fn logout_for(state: Arc<ApiState>, service: &'static str) -> Response<Body> {
    let path = match service {
        "netease" => &state.cookie,
        "qq" => &state.qq_cookie,
        _ => &state.kugou_cookie,
    };
    let _ = tokio::fs::write(path, "").await;
    state
        .cookie_values
        .write()
        .await
        .insert(service, String::new());
    json_response(json!({"ok":true}))
}
async fn logout_netease(State(state): State<Arc<ApiState>>) -> Response<Body> {
    logout_for(state, "netease").await
}
async fn logout_qq(State(state): State<Arc<ApiState>>) -> Response<Body> {
    logout_for(state, "qq").await
}
async fn logout_kugou(State(state): State<Arc<ApiState>>) -> Response<Body> {
    logout_for(state, "kugou").await
}

fn ncm(state: &ApiState) -> NcmApi {
    NcmApi::new(true, state.cookie.to_string_lossy().as_ref())
}

async fn ncm_profile(state: &ApiState) -> Option<(usize, Value)> {
    let response = ncm(&state).login_status().await.ok()?;
    let body = response.deserialize::<Value>().ok()?;
    let data = body.get("data").unwrap_or(&body);
    let profile = data.get("profile").or_else(|| body.get("profile"))?.clone();
    let id = profile.get("userId")?.as_u64()? as usize;
    Some((id, profile))
}

async fn user_playlists(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let Some((uid, _)) = ncm_profile(&state).await else {
        return json_response(json!({"loggedIn":false,"playlists":[]}));
    };
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(60)
        .clamp(12, 100);
    match ncm(&state)
        .user_playlist(uid, Some(json!({"limit":limit,"offset":0})))
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => {
            let list = body.get("playlist").and_then(Value::as_array).cloned().unwrap_or_default().into_iter().map(|pl| json!({
                "id":pl.get("id"),"name":pl.get("name"),"cover":pl.get("coverImgUrl"),"trackCount":pl.get("trackCount"),
                "playCount":pl.get("playCount"),"creator":pl.pointer("/creator/nickname"),"subscribed":pl.get("subscribed"),"specialType":pl.get("specialType")
            })).collect::<Vec<_>>();
            json_response(json!({"loggedIn":true,"userId":uid,"playlists":list}))
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"loggedIn":true,"playlists":[]})),
        )
            .into_response(),
    }
}

async fn song_like_check(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let Some((uid, _)) = ncm_profile(&state).await else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"loggedIn":false,"liked":{}})),
        )
            .into_response();
    };
    let ids = query
        .get("ids")
        .or_else(|| query.get("id"))
        .cloned()
        .unwrap_or_default()
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    match ncm(&state).likelist(uid).await.and_then(|r| {
        r.deserialize::<Value>()
            .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
    }) {
        Ok(body) => {
            let liked_ids = body
                .get("ids")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|v| v.as_u64().map(|n| n.to_string()))
                .collect::<std::collections::HashSet<_>>();
            let liked = ids
                .iter()
                .map(|id| (id.clone(), Value::Bool(liked_ids.contains(id))))
                .collect::<serde_json::Map<_, _>>();
            json_response(json!({"loggedIn":true,"ids":ids,"liked":liked}))
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string()})),
        )
            .into_response(),
    }
}

async fn song_like(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    request: Request,
) -> Response<Body> {
    if ncm_profile(&state).await.is_none() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"loggedIn":false,"error":"LOGIN_REQUIRED"})),
        )
            .into_response();
    }
    let body = request_json(request).await;
    let id = body
        .get("id")
        .and_then(Value::as_u64)
        .or_else(|| query.get("id").and_then(|v| v.parse().ok()))
        .unwrap_or_default() as usize;
    let liked = body
        .get("like")
        .and_then(Value::as_bool)
        .or_else(|| query.get("like").map(|v| v != "false"))
        .unwrap_or(true);
    match ncm(&state)
        .like(id, Some(json!({"like":liked})))
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => json_response(
            json!({"loggedIn":true,"id":id,"liked":liked,"code":body.get("code"),"body":body}),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string()})),
        )
            .into_response(),
    }
}

async fn song_comments(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("id")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(20)
        .clamp(6, 50);
    let offset = query
        .get("offset")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    match ncm(&state)
        .comment(
            id,
            ResourceType::Song,
            limit,
            offset / limit + 1,
            2,
            0,
            false,
        )
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => {
            let data = body.get("data").unwrap_or(&body);
            let raw = data
                .get("comments")
                .or_else(|| body.get("comments"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            let comments = raw.into_iter().map(|c| json!({"id":c.get("commentId"),"content":c.get("content"),"likedCount":c.get("likedCount"),"time":c.get("time"),"user":{"id":c.pointer("/user/userId"),"nickname":c.pointer("/user/nickname"),"avatar":c.pointer("/user/avatarUrl")}})).collect::<Vec<_>>();
            json_response(
                json!({"id":id,"total":data.get("totalCount").or_else(|| body.get("total")),"comments":comments,"hot":offset==0,"body":body}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"comments":[]})),
        )
            .into_response(),
    }
}

async fn artist_detail(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
) -> Response<Body> {
    let id = query
        .get("id")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or_default();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(30)
        .clamp(10, 80);
    match ncm(&state)
        .artist_songs(id, Some(json!({"order":"hot","limit":limit,"offset":0})))
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => {
            let songs = body
                .get("songs")
                .or_else(|| body.pointer("/data/songs"))
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .map(map_ncm_song)
                .collect::<Vec<_>>();
            json_response(
                json!({"id":id,"artist":{"id":id,"name":body.pointer("/artist/name"),"avatar":body.pointer("/artist/picUrl"),"brief":body.pointer("/artist/briefDesc")},"songs":songs,"body":body}),
            )
        }
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"songs":[]})),
        )
            .into_response(),
    }
}

async fn playlist_create(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    request: Request,
) -> Response<Body> {
    if ncm_profile(&state).await.is_none() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"loggedIn":false,"error":"LOGIN_REQUIRED"})),
        )
            .into_response();
    }
    let body = request_json(request).await;
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .or_else(|| query.get("name").map(String::as_str))
        .unwrap_or_default()
        .trim();
    let privacy = body
        .get("privacy")
        .and_then(Value::as_u64)
        .or_else(|| query.get("privacy").and_then(|v| v.parse().ok()))
        .unwrap_or(0) as usize;
    if name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing playlist name"})),
        )
            .into_response();
    }
    match ncm(&state)
        .playlist_create(name, privacy)
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => json_response(
            json!({"loggedIn":true,"playlist":body.get("playlist").or_else(||body.get("data")),"body":body}),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string()})),
        )
            .into_response(),
    }
}

async fn playlist_add_song(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    request: Request,
) -> Response<Body> {
    if ncm_profile(&state).await.is_none() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"loggedIn":false,"error":"LOGIN_REQUIRED"})),
        )
            .into_response();
    }
    let body = request_json(request).await;
    let pid = body
        .get("pid")
        .and_then(Value::as_u64)
        .or_else(|| query.get("pid").and_then(|v| v.parse().ok()))
        .unwrap_or_default() as usize;
    let raw_ids = body
        .get("id")
        .or_else(|| body.get("ids"))
        .and_then(|v| {
            v.as_str()
                .map(str::to_owned)
                .or_else(|| v.as_u64().map(|n| n.to_string()))
        })
        .or_else(|| query.get("id").or_else(|| query.get("ids")).cloned())
        .unwrap_or_default();
    let ids = raw_ids
        .split(',')
        .filter_map(|v| v.trim().parse::<usize>().ok())
        .collect::<Vec<_>>();
    if pid == 0 || ids.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":"Missing playlist id or song id"})),
        )
            .into_response();
    }
    match ncm(&state)
        .playlist_tracks(pid, 1, ids.clone())
        .await
        .and_then(|r| {
            r.deserialize::<Value>()
                .map_err(|_| ncmapi2::ApiErr::DeserializeErr)
        }) {
        Ok(body) => json_response(
            json!({"loggedIn":true,"pid":pid,"id":raw_ids,"success":body.get("code").and_then(Value::as_i64).unwrap_or(200)==200,"code":body.get("code"),"body":body}),
        ),
        Err(error) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"error":error.to_string(),"success":false})),
        )
            .into_response(),
    }
}

fn map_ncm_song(song: Value) -> Value {
    let artists = song
        .get("ar")
        .or_else(|| song.get("artists"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let artist = artists
        .iter()
        .filter_map(|a| a.get("name").and_then(Value::as_str))
        .collect::<Vec<_>>()
        .join(" / ");
    let album = song
        .get("al")
        .or_else(|| song.get("album"))
        .cloned()
        .unwrap_or_default();
    json!({"id":song.get("id"),"name":song.get("name"),"artist":artist,"artists":artists,"artistId":artists.first().and_then(|a|a.get("id")),"album":album.get("name"),"albumId":album.get("id"),"cover":album.get("picUrl"),"duration":song.get("dt").or_else(||song.get("duration")),"fee":song.get("fee"),"source":"netease"})
}

async fn proxy(
    state: Arc<ApiState>,
    query: HashMap<String, String>,
    headers: HeaderMap,
    cover: bool,
) -> Response<Body> {
    let Some(url) = query
        .get("url")
        .filter(|url| url.starts_with("http://") || url.starts_with("https://"))
    else {
        return (StatusCode::BAD_REQUEST, "Invalid url").into_response();
    };
    let mut request = state.http.get(url).header(header::USER_AGENT, USER_AGENT);
    if let Some(range) = headers.get(header::RANGE) {
        request = request.header(header::RANGE, range);
    }
    if cover {
        request = request.header(header::REFERER, "https://music.163.com/");
    } else {
        let referer = reqwest::Url::parse(url)
            .ok()
            .and_then(|parsed| parsed.host_str().map(str::to_owned))
            .filter(|host| host.contains("qq.com") || host.contains("qpic.cn"))
            .map(|_| "https://y.qq.com/")
            .unwrap_or("https://music.163.com/");
        request = request.header(header::REFERER, referer);
    }
    let upstream = match request.send().await {
        Ok(value) => value,
        Err(error) => return (StatusCode::BAD_GATEWAY, error.to_string()).into_response(),
    };
    let status = upstream.status();
    let upstream_headers = upstream.headers().clone();
    let stream = upstream.bytes_stream().map_err(std::io::Error::other);
    let mut response = Response::builder()
        .status(status)
        .body(Body::from_stream(stream))
        .unwrap();
    for name in [
        header::CONTENT_TYPE,
        header::CONTENT_LENGTH,
        header::CONTENT_RANGE,
        header::ACCEPT_RANGES,
    ] {
        if let Some(value) = upstream_headers.get(&name) {
            response.headers_mut().insert(name, value.clone());
        }
    }
    response.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    if cover {
        response.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=86400"),
        );
    }
    response
}

async fn cover_proxy(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    headers: HeaderMap,
) -> Response<Body> {
    proxy(state, query, headers, true).await
}
async fn audio_proxy(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<HashMap<String, String>>,
    headers: HeaderMap,
) -> Response<Body> {
    proxy(state, query, headers, false).await
}

async fn index(State(state): State<Arc<ApiState>>) -> Response<Body> {
    serve_path(&state.public, "index.html").await
}
async fn favicon() -> Response<Body> {
    (
        [(header::CONTENT_TYPE, "image/x-icon")],
        include_bytes!("../icons/icon.ico").as_slice(),
    )
        .into_response()
}
async fn static_file(
    State(state): State<Arc<ApiState>>,
    AxumPath(path): AxumPath<String>,
) -> Response<Body> {
    serve_path(&state.public, &path).await
}

async fn serve_path(root: &Path, requested: &str) -> Response<Body> {
    let relative = Path::new(requested);
    if relative.components().any(|c| {
        matches!(
            c,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let path = root.join(relative);
    match tokio::fs::read(&path).await {
        Ok(bytes) => {
            let mime = mime_guess::from_path(&path).first_or_octet_stream();
            let mut response = ([(header::CONTENT_TYPE, mime.as_ref())], bytes).into_response();
            if is_frontend_document(&path) {
                response.headers_mut().insert(
                    header::CACHE_CONTROL,
                    HeaderValue::from_static("no-store, no-cache, must-revalidate"),
                );
            }
            response
        }
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

fn is_frontend_document(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|extension| extension.to_str()),
        Some("html" | "css" | "js")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kugou_device_cookie_is_stable_and_complete() {
        let first = ensure_kugou_device_cookie("userid=42; token=test-token");
        let second = ensure_kugou_device_cookie(&first);
        assert_eq!(first, second);
        let map = parse_cookie_map(&first);
        for key in [
            "KUGOU_API_GUID",
            "KUGOU_API_MID",
            "KUGOU_API_MAC",
            "KUGOU_API_DEV",
        ] {
            assert!(map.get(key).is_some_and(|value| !value.is_empty()));
        }
    }

    #[test]
    fn frontend_documents_are_not_cached() {
        assert!(is_frontend_document(Path::new("index.html")));
        assert!(is_frontend_document(Path::new("styles/app.css")));
        assert!(is_frontend_document(Path::new("scripts/app.js")));
        assert!(!is_frontend_document(Path::new("images/cover.png")));
    }

    #[test]
    fn kugou_play_cookie_matches_legacy_minimal_header() {
        let cookie = "userid=42; token=test-token; nickname=hidden; KUGOU_API_MID=12345; KUGOU_API_DEV=device";
        assert_eq!(
            kugou_play_cookie(cookie),
            "userid=42; token=test-token; KUGOU_API_MID=12345"
        );
    }

    #[test]
    fn kugou_playable_url_skips_empty_primary_url() {
        let body = json!({"data":{"play_url":"","play_backup_url":"https://cdn.example/song.mp3"}});
        assert_eq!(kugou_playable_url(&body), "https://cdn.example/song.mp3");
    }

    #[test]
    fn netease_membership_normalizes_vip_and_svip() {
        let vip = normalize_netease_vip(&json!({}), &json!({"vipType": 11}), &json!({}));
        assert_eq!(vip.get("vipLevel"), Some(&json!("vip")));
        assert_eq!(vip.get("isVip"), Some(&json!(true)));

        let svip = normalize_netease_vip(
            &json!({}),
            &json!({"vipType": 11}),
            &json!({"data":{"package":{"title":"黑胶SVIP"}}}),
        );
        assert_eq!(svip.get("vipLevel"), Some(&json!("svip")));
        assert_eq!(svip.get("isSvip"), Some(&json!(true)));
    }

    #[test]
    fn kugou_membership_requires_an_active_role() {
        let active = normalize_kugou_membership(&json!({
            "errno": 0,
            "error_code": 0,
            "data": {"vipRemains": 25, "isExpiredMember": 0, "role": 1, "user_type": 3}
        }));
        assert_eq!(active.get("vipType"), Some(&json!(3)));
        assert_eq!(active.get("isVip"), Some(&json!(true)));

        let expired = normalize_kugou_membership(&json!({
            "errno": 0,
            "data": {"vipRemains": 25, "isExpiredMember": 1, "role": 1}
        }));
        assert_eq!(expired.get("vipLevel"), Some(&json!("none")));
        assert_eq!(expired.get("isVip"), Some(&json!(false)));
    }

    #[test]
    fn kugou_track_mapping_matches_legacy_metadata_cleanup() {
        let track = map_kugou_track(json!({
            "name": "关喆 - 想你的夜.mp3",
            "filename": "关喆 - 想你的夜.mp3",
            "hash": "CEED9D73B562F54C6B20550AB3A36660",
            "album_audio_id": 302443074,
            "album_id": "981752",
            "fileid": 778899,
            "time_length": 268,
            "trans_param": {
                "union_cover": "http://imge.kugou.com/stdmusic/{size}/cover.jpg"
            }
        }));
        assert_eq!(track.get("name"), Some(&json!("想你的夜")));
        assert_eq!(track.get("artist"), Some(&json!("关喆")));
        assert_eq!(
            track.get("cover"),
            Some(&json!("http://imge.kugou.com/stdmusic/300/cover.jpg"))
        );
        assert_eq!(track.get("duration"), Some(&json!(268000)));
        assert_eq!(track.get("fileId"), Some(&json!("778899")));
        assert_eq!(track.pointer("/artists/0/name"), Some(&json!("关喆")));
    }

    #[test]
    fn kugou_like_request_bodies_match_cloudlist_contract() {
        let add = kugou_add_song_body("42", "token", "ABC", "歌曲", 7, 8);
        assert_eq!(add.get("listid"), Some(&json!(2)));
        assert_eq!(add.pointer("/data/0/hash"), Some(&json!("ABC")));
        assert_eq!(add.pointer("/data/0/album_id"), Some(&json!(7)));
        assert_eq!(add.pointer("/data/0/mixsongid"), Some(&json!(8)));

        let delete = kugou_delete_song_body("42", "token", 99);
        assert_eq!(delete.get("listid"), Some(&json!(2)));
        assert_eq!(delete.pointer("/data/0/fileid"), Some(&json!(99)));
    }
}
