use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    net::TcpListener,
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_opener::OpenerExt;

mod analyzer;
mod server;

const BRIDGE: &str = include_str!("bridge.js");
const LOGIN_HELPER: &str = r#"
window.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    var nodes = Array.from(document.querySelectorAll('a,button,span,div'));
    var login = nodes.find(function (node) {
      var text = (node.textContent || '').trim();
      if (!/登录|登陆|立即登录/.test(text)) return false;
      var rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (login) login.click();
  }, 700);
});
"#;

#[derive(Default)]
struct RuntimeState {
    port: Mutex<u16>,
    lyrics: Mutex<Value>,
    wallpaper: Mutex<Value>,
    hotkeys: Mutex<HashMap<String, String>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowState {
    is_maximized: bool,
    is_native_full_screen: bool,
    is_html_full_screen: bool,
    is_window_full_screen: bool,
    is_full_screen: bool,
    is_minimized: bool,
    is_visible: bool,
    is_focused: bool,
    is_primary_display: bool,
    has_display_on_left: bool,
    has_display_on_right: bool,
    display_bounds: Option<Value>,
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "MAIN_WINDOW_MISSING".into())
}

fn window_state(window: &WebviewWindow) -> WindowState {
    let fullscreen = window.is_fullscreen().unwrap_or(false);
    let monitor = window.current_monitor().ok().flatten();
    WindowState {
        is_maximized: window.is_maximized().unwrap_or(false),
        is_native_full_screen: fullscreen,
        is_html_full_screen: false,
        is_window_full_screen: fullscreen,
        is_full_screen: fullscreen,
        is_minimized: window.is_minimized().unwrap_or(false),
        is_visible: window.is_visible().unwrap_or(true),
        is_focused: window.is_focused().unwrap_or(false),
        is_primary_display: true,
        has_display_on_left: false,
        has_display_on_right: false,
        display_bounds: monitor.map(|m| {
            let p = m.position();
            let s = m.size();
            json!({ "x": p.x, "y": p.y, "width": s.width, "height": s.height })
        }),
    }
}

fn emit_window_state(window: &WebviewWindow) {
    let _ = window.emit("desktop-window-state", window_state(window));
}

#[tauri::command]
fn window_minimize(app: AppHandle) -> Result<(), String> {
    main_window(&app)?.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_toggle_maximize(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())?;
    } else {
        window.maximize().map_err(|e| e.to_string())?;
    }
    emit_window_state(&window);
    Ok(())
}

#[tauri::command]
fn window_toggle_fullscreen(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    let next = !window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(next).map_err(|e| e.to_string())?;
    emit_window_state(&window);
    Ok(())
}

#[tauri::command]
fn window_exit_fullscreen_windowed(app: AppHandle) -> Result<(), String> {
    let window = main_window(&app)?;
    window.set_fullscreen(false).map_err(|e| e.to_string())?;
    emit_window_state(&window);
    Ok(())
}

#[tauri::command]
fn window_get_state(app: AppHandle) -> Result<WindowState, String> {
    Ok(window_state(&main_window(&app)?))
}

#[tauri::command]
fn window_close(app: AppHandle) -> Result<(), String> {
    main_window(&app)?.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_start_drag(app: AppHandle) -> Result<(), String> {
    main_window(&app)?
        .start_dragging()
        .map_err(|e| e.to_string())
}

fn service_info(service: &str) -> Option<(&'static str, &'static str)> {
    match service {
        "netease" => Some(("网易云音乐登录", "https://music.163.com/#/login")),
        "qq" => Some(("QQ 音乐登录", "https://y.qq.com/n/ryqq/profile")),
        "kugou" => Some(("酷狗音乐登录", "https://www.kugou.com/")),
        _ => None,
    }
}

#[tauri::command]
async fn open_music_login(app: AppHandle, service: String) -> Result<Value, String> {
    let (title, url) = service_info(&service).ok_or("UNKNOWN_MUSIC_SERVICE")?;
    let label = format!("login-{service}");
    let existing = app.get_webview_window(&label);
    let is_new = existing.is_none();
    let window = if let Some(window) = existing {
        let _ = window.show();
        let _ = window.set_focus();
        window
    } else {
        WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(url.parse().unwrap()))
            .title(title)
            .inner_size(1100.0, 760.0)
            .initialization_script(LOGIN_HELPER)
            .build()
            .map_err(|e| e.to_string())?
    };
    if is_new && service == "qq" {
        let _ = window.clear_all_browsing_data();
        let _ = window.navigate(url.parse().unwrap());
    }
    let mut qq_warmup_started = false;
    for _ in 0..300 {
        if app.get_webview_window(&label).is_none() {
            return Ok(json!({ "ok": false, "cancelled": true, "message": "登录窗口已关闭" }));
        }
        if let Ok(cookies) = window.cookies() {
            let header = cookie_header(&service, cookies);
            if cookie_has_login(&service, &header) {
                let _ = window.close();
                return Ok(json!({ "ok": true, "cookie": header }));
            }
            if service == "qq" && !qq_warmup_started && qq_cookie_has_auth(&header) {
                qq_warmup_started = true;
                let _ = window.navigate("https://y.qq.com/n/ryqq/player".parse().unwrap());
            }
        }
        tokio::time::sleep(Duration::from_millis(1200)).await;
    }
    Ok(json!({ "ok": false, "error": "LOGIN_TIMEOUT" }))
}

fn cookie_domain_allowed(service: &str, domain: Option<&str>) -> bool {
    let domain = domain
        .unwrap_or_default()
        .trim_start_matches('.')
        .to_ascii_lowercase();
    match service {
        "netease" => {
            domain == "163.com"
                || domain.ends_with(".163.com")
                || domain == "netease.com"
                || domain.ends_with(".netease.com")
        }
        "qq" => domain == "qq.com" || domain.ends_with(".qq.com"),
        "kugou" => {
            domain == "kugou.com"
                || domain.ends_with(".kugou.com")
                || domain == "kgimg.com"
                || domain.ends_with(".kgimg.com")
        }
        _ => false,
    }
}

fn cookie_header(service: &str, cookies: Vec<tauri::webview::cookie::Cookie<'static>>) -> String {
    cookies
        .into_iter()
        .filter(|cookie| cookie_domain_allowed(service, cookie.domain()))
        .filter(|cookie| !cookie.value().is_empty())
        .map(|cookie| format!("{}={}", cookie.name(), cookie.value()))
        .collect::<Vec<_>>()
        .join("; ")
}

fn cookie_value<'a>(header: &'a str, name: &str) -> Option<&'a str> {
    header.split(';').find_map(|part| {
        let (key, value) = part.trim().split_once('=')?;
        (key == name).then_some(value)
    })
}

fn cookie_has_login(service: &str, header: &str) -> bool {
    match service {
        "netease" => cookie_value(header, "MUSIC_U").is_some(),
        "qq" => {
            let uin = cookie_value(header, "uin")
                .or_else(|| cookie_value(header, "qqmusic_uin"))
                .or_else(|| cookie_value(header, "wxuin"));
            let key = cookie_value(header, "qm_keyst")
                .or_else(|| cookie_value(header, "qqmusic_key"))
                .or_else(|| cookie_value(header, "music_key"))
                .or_else(|| cookie_value(header, "wxskey"));
            uin.is_some() && key.is_some()
        }
        "kugou" => {
            let user = cookie_value(header, "userid").or_else(|| cookie_value(header, "KugooID"));
            let token = cookie_value(header, "token")
                .or_else(|| cookie_value(header, "KuGoo"))
                .or_else(|| cookie_value(header, "t"));
            user.is_some() && token.is_some()
        }
        _ => false,
    }
}

fn qq_cookie_has_auth(header: &str) -> bool {
    let account = cookie_value(header, "uin")
        .or_else(|| cookie_value(header, "qqmusic_uin"))
        .or_else(|| cookie_value(header, "wxuin"))
        .or_else(|| cookie_value(header, "p_uin"));
    let auth = cookie_value(header, "qm_keyst")
        .or_else(|| cookie_value(header, "qqmusic_key"))
        .or_else(|| cookie_value(header, "music_key"))
        .or_else(|| cookie_value(header, "p_skey"))
        .or_else(|| cookie_value(header, "skey"))
        .or_else(|| cookie_value(header, "psrf_qqaccess_token"))
        .or_else(|| cookie_value(header, "psrf_qqrefresh_token"))
        .or_else(|| cookie_value(header, "wxrefresh_token"))
        .or_else(|| cookie_value(header, "wxskey"));
    account.is_some() && auth.is_some()
}

#[tauri::command]
fn clear_music_login(app: AppHandle, service: String) -> Result<Value, String> {
    service_info(&service).ok_or("UNKNOWN_MUSIC_SERVICE")?;
    let file = match service.as_str() {
        "netease" => ".cookie",
        "qq" => ".qq-cookie",
        _ => ".kugou-cookie",
    };
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = fs::remove_file(dir.join(file));
    }
    if let Some(window) = app.get_webview_window(&format!("login-{service}")) {
        let _ = window.clear_all_browsing_data();
        let _ = window.close();
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn open_update_installer(app: AppHandle, file_path: String) -> Result<Value, String> {
    let path = PathBuf::from(file_path);
    if !path.is_file() {
        return Ok(json!({ "ok": false, "error": "UPDATE_FILE_MISSING" }));
    }
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn restart_app(app: AppHandle) -> Value {
    app.restart();
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyBinding {
    action: String,
    accelerator: String,
}

#[tauri::command]
fn configure_global_hotkeys(
    app: AppHandle,
    state: State<RuntimeState>,
    bindings: Vec<HotkeyBinding>,
) -> Value {
    app.global_shortcut().unregister_all().ok();
    state.hotkeys.lock().unwrap().clear();
    let mut results = Vec::new();
    for item in bindings {
        let ok = item
            .accelerator
            .parse::<Shortcut>()
            .map(|shortcut| app.global_shortcut().register(shortcut).is_ok())
            .unwrap_or(false);
        if ok {
            state
                .hotkeys
                .lock()
                .unwrap()
                .insert(item.accelerator.clone(), item.action.clone());
            results.push(
                json!({ "action": item.action, "accelerator": item.accelerator, "ok": true }),
            );
        } else {
            results.push(json!({ "action": item.action, "accelerator": item.accelerator, "ok": false,
              "conflict": { "sourceName": "系统 / 其他软件", "sourceIcon": "warning", "reason": "该组合键已被占用或被系统保留" } }));
        }
    }
    json!({ "ok": true, "results": results })
}

#[tauri::command]
async fn export_json_file(app: AppHandle, payload: Value) -> Result<Value, String> {
    let default_name = payload
        .get("defaultName")
        .and_then(Value::as_str)
        .unwrap_or("mineradio-export.json");
    let text = payload
        .get("text")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .unwrap_or_else(|| {
            serde_json::to_string_pretty(payload.get("data").unwrap_or(&json!({})))
                .unwrap_or_default()
        });
    let path = app
        .dialog()
        .file()
        .set_file_name(default_name)
        .add_filter("JSON", &["json"])
        .blocking_save_file();
    let Some(path) = path.and_then(|p| p.as_path().map(Path::to_owned)) else {
        return Ok(json!({ "ok": false, "canceled": true }));
    };
    fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true, "filePath": path }))
}

#[tauri::command]
async fn import_json_file(app: AppHandle) -> Result<Value, String> {
    let path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();
    let Some(path) = path.and_then(|p| p.as_path().map(Path::to_owned)) else {
        return Ok(json!({ "ok": false, "canceled": true }));
    };
    let text = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true, "filePath": path, "text": text }))
}

fn merge_state(target: &Mutex<Value>, payload: Value, enabled: Option<bool>) -> Value {
    let mut current = target.lock().unwrap();
    if !current.is_object() {
        *current = json!({});
    }
    if let (Some(dst), Some(src)) = (current.as_object_mut(), payload.as_object()) {
        dst.extend(src.clone());
        if let Some(value) = enabled {
            dst.insert("enabled".into(), Value::Bool(value));
        }
    }
    current.clone()
}

fn overlay_window(
    app: &AppHandle,
    label: &str,
    page: &str,
    transparent: bool,
) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(label) {
        return Ok(window);
    }
    let port = *app.state::<RuntimeState>().port.lock().unwrap();
    let url = format!("http://127.0.0.1:{port}/{page}").parse().unwrap();
    let mut builder = WebviewWindowBuilder::new(app, label, WebviewUrl::External(url))
        .title("Mineradio")
        .decorations(false)
        .transparent(transparent)
        .shadow(false)
        .skip_taskbar(true)
        .always_on_top(label == "desktop-lyrics")
        .initialization_script(BRIDGE);
    if label == "desktop-lyrics" {
        builder = builder.inner_size(900.0, 180.0);
    }
    builder.build().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_desktop_lyrics_enabled(
    app: AppHandle,
    state: State<RuntimeState>,
    enabled: bool,
    payload: Value,
) -> Result<Value, String> {
    let value = merge_state(&state.lyrics, payload, Some(enabled));
    if enabled {
        let window = overlay_window(&app, "desktop-lyrics", "desktop-lyrics.html", true)?;
        let _ = window.emit("mineradio-desktop-lyrics-state", value);
    } else if let Some(window) = app.get_webview_window("desktop-lyrics") {
        let _ = window.close();
    }
    let _ = app.emit(
        "mineradio-desktop-lyrics-enabled-state",
        json!({ "enabled": enabled }),
    );
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn update_desktop_lyrics(
    app: AppHandle,
    state: State<RuntimeState>,
    payload: Value,
) -> Result<Value, String> {
    let value = merge_state(&state.lyrics, payload, None);
    if value
        .get("enabled")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        let window = overlay_window(&app, "desktop-lyrics", "desktop-lyrics.html", true)?;
        let _ = window.emit("mineradio-desktop-lyrics-state", value);
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn set_wallpaper_mode(
    app: AppHandle,
    state: State<RuntimeState>,
    enabled: bool,
    payload: Value,
) -> Result<Value, String> {
    let value = merge_state(&state.wallpaper, payload, Some(enabled));
    if enabled {
        let window = overlay_window(&app, "wallpaper", "wallpaper.html", false)?;
        let _ = window.emit("mineradio-wallpaper-state", value);
    } else if let Some(window) = app.get_webview_window("wallpaper") {
        let _ = window.close();
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn update_wallpaper_mode(
    app: AppHandle,
    state: State<RuntimeState>,
    payload: Value,
) -> Result<Value, String> {
    let value = merge_state(&state.wallpaper, payload, None);
    if let Some(window) = app.get_webview_window("wallpaper") {
        let _ = window.emit("mineradio-wallpaper-state", value);
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn set_lyrics_pointer_capture(app: AppHandle, active: bool) -> Result<Value, String> {
    if let Some(window) = app.get_webview_window("desktop-lyrics") {
        window
            .set_ignore_cursor_events(!active)
            .map_err(|e| e.to_string())?;
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn set_lyrics_hot_bounds(_bounds: Value) -> Value {
    json!({ "ok": true })
}

#[tauri::command]
fn set_lyrics_lock_state(app: AppHandle, locked: bool) -> Result<Value, String> {
    if let Some(window) = app.get_webview_window("desktop-lyrics") {
        window
            .set_ignore_cursor_events(locked)
            .map_err(|e| e.to_string())?;
    }
    let _ = app.emit(
        "mineradio-desktop-lyrics-lock-state",
        json!({ "locked": locked }),
    );
    Ok(json!({ "ok": true, "locked": locked }))
}

#[tauri::command]
fn move_lyrics_by(app: AppHandle, dx: f64, dy: f64) -> Result<Value, String> {
    let window = app
        .get_webview_window("desktop-lyrics")
        .ok_or("NO_DESKTOP_LYRICS_WINDOW")?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(
            pos.x + dx.clamp(-160.0, 160.0) as i32,
            pos.y + dy.clamp(-160.0, 160.0) as i32,
        ))
        .map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true }))
}

fn start_rust_server(app: &AppHandle, state: &RuntimeState) -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    eprintln!("Mineradio Rust server listening on 127.0.0.1:{port}");
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&data).map_err(|e| e.to_string())?;
    migrate_legacy_login_files(app, &data);
    let public = app
        .path()
        .resolve("public", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn(async move {
        let listener =
            tokio::net::TcpListener::from_std(listener).expect("invalid Mineradio listener");
        if let Err(error) = server::serve(
            listener,
            server::ServerPaths {
                public,
                cookie: data.join(".cookie"),
                qq_cookie: data.join(".qq-cookie"),
                kugou_cookie: data.join(".kugou-cookie"),
                beat_cache: data.join("beatmaps"),
                updates: data.join("updates"),
            },
        )
        .await
        {
            eprintln!("Mineradio Rust server failed: {error}");
        }
    });
    *state.port.lock().unwrap() = port;
    Ok(port)
}

fn migrate_legacy_login_files(app: &AppHandle, target_dir: &std::path::Path) {
    let marker = target_dir.join(".legacy-login-migrated-v2");
    if marker.exists() {
        return;
    }
    let mut candidates = Vec::new();
    if let Ok(data_dir) = app.path().data_dir() {
        candidates.push(data_dir.join("Mineradio"));
    }
    if let Ok(app_data) = app.path().app_data_dir() {
        if let Some(parent) = app_data.parent() {
            candidates.push(parent.join("Mineradio"));
        }
    }
    for name in [".cookie", ".qq-cookie", ".kugou-cookie"] {
        let target = target_dir.join(name);
        if fs::metadata(&target)
            .map(|meta| meta.len() > 0)
            .unwrap_or(false)
        {
            continue;
        }
        for source_dir in &candidates {
            let source = source_dir.join(name);
            if fs::metadata(&source)
                .map(|meta| meta.is_file() && meta.len() > 0)
                .unwrap_or(false)
                && fs::copy(&source, &target).is_ok()
            {
                break;
            }
        }
    }
    let _ = fs::write(marker, b"1");
}

fn wait_for_server(port: u16) -> bool {
    for _ in 0..80 {
        if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(100));
    }
    false
}

fn create_main_window(app: &AppHandle, port: u16) -> Result<WebviewWindow, String> {
    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("NO_PRIMARY_MONITOR")?;
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let width = (size.width * 0.75).max(960.0);
    let height = (width * 9.0 / 16.0).max(540.0).min(size.height - 32.0);
    let url = format!("http://127.0.0.1:{port}").parse().unwrap();
    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
        .title("Mineradio")
        .inner_size(width, height)
        .min_inner_size(960.0, 540.0)
        .background_color(tauri::window::Color(0, 0, 0, 255))
        .initialization_script(BRIDGE);
    #[cfg(not(target_os = "macos"))]
    {
        builder = builder.decorations(false);
    }
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    let window = builder.build().map_err(|e| e.to_string())?;
    emit_window_state(&window);
    Ok(window)
}

pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tauri::Builder::default()
        .manage(RuntimeState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        return;
                    }
                    let key = shortcut.to_string();
                    if let Some(action) = app
                        .state::<RuntimeState>()
                        .hotkeys
                        .lock()
                        .unwrap()
                        .get(&key)
                        .cloned()
                    {
                        let _ = app.emit("mineradio-global-hotkey", json!({ "action": action }));
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            window_minimize,
            window_toggle_maximize,
            window_toggle_fullscreen,
            window_exit_fullscreen_windowed,
            window_get_state,
            window_close,
            window_start_drag,
            open_music_login,
            clear_music_login,
            open_update_installer,
            restart_app,
            configure_global_hotkeys,
            export_json_file,
            import_json_file,
            set_desktop_lyrics_enabled,
            update_desktop_lyrics,
            set_wallpaper_mode,
            update_wallpaper_mode,
            set_lyrics_pointer_capture,
            set_lyrics_hot_bounds,
            set_lyrics_lock_state,
            move_lyrics_by
        ])
        .setup(|app| {
            let port = start_rust_server(app.handle(), &app.state::<RuntimeState>())?;
            if !wait_for_server(port) {
                return Err("Rust API server startup timed out".into());
            }
            create_main_window(app.handle(), port)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main"
                && matches!(
                    event,
                    tauri::WindowEvent::Resized(_)
                        | tauri::WindowEvent::Moved(_)
                        | tauri::WindowEvent::Focused(_)
                )
            {
                if let Some(webview) = window.app_handle().get_webview_window("main") {
                    emit_window_state(&webview);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Mineradio");
}
