use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    net::TcpListener,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
#[cfg(target_os = "macos")]
use tauri::menu::{MenuItemKind, PredefinedMenuItem};
#[cfg(target_os = "macos")]
use tauri::tray::TrayIconBuilder;
use tauri::{
    menu::{Menu, MenuItem},
    webview::PageLoadEvent,
    AppHandle, Emitter, Manager, PhysicalPosition, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_opener::OpenerExt;

mod local_library;

#[cfg(target_os = "macos")]
mod macos_window_drag {
    use objc2::{
        define_class, msg_send,
        rc::{Allocated, Retained},
    };
    use objc2_app_kit::{NSAutoresizingMaskOptions, NSEvent, NSView};
    use objc2_foundation::{MainThreadMarker, NSPoint, NSRect, NSSize};
    use tauri::WebviewWindow;

    #[derive(Default)]
    struct WindowDragViewIvars;

    define_class!(
        #[unsafe(super(NSView))]
        #[name = "MineradioWindowDragView"]
        #[ivars = WindowDragViewIvars]
        struct WindowDragView;

        impl WindowDragView {
            #[unsafe(method(mouseDown:))]
            fn mouse_down(&self, event: &NSEvent) {
                if let Some(window) = self.window() {
                    window.performWindowDragWithEvent(event);
                }
            }
        }
    );

    impl WindowDragView {
        unsafe fn init_with_frame(this: Allocated<Self>, frame: NSRect) -> Retained<Self> {
            let this = this.set_ivars(WindowDragViewIvars);
            msg_send![super(this), initWithFrame: frame]
        }
    }

    pub fn install(window: &WebviewWindow) -> Result<(), String> {
        window
            .with_webview(|webview| unsafe {
                let ns_window: &objc2_app_kit::NSWindow = &*webview.ns_window().cast();
                let Some(content_view) = ns_window.contentView() else {
                    return;
                };
                let bounds = content_view.bounds();
                let frame = NSRect::new(
                    NSPoint::new(84.0, bounds.size.height - 28.0),
                    NSSize::new((bounds.size.width - 194.0).max(0.0), 28.0),
                );
                let drag_view = WindowDragView::init_with_frame(
                    MainThreadMarker::new()
                        .expect("macOS UI must run on the main thread")
                        .alloc(),
                    frame,
                );
                drag_view.setAutoresizingMask(
                    NSAutoresizingMaskOptions::ViewWidthSizable
                        | NSAutoresizingMaskOptions::ViewMinYMargin,
                );
                content_view.addSubview(&drag_view);
            })
            .map_err(|error| error.to_string())
    }
}

#[cfg(target_os = "macos")]
mod macos_desktop_lyrics_unlock_button {
    use objc2::{
        define_class, msg_send,
        rc::{Allocated, Retained},
    };
    use objc2_app_kit::{NSAutoresizingMaskOptions, NSEvent, NSView};
    use objc2_foundation::MainThreadMarker;
    use std::sync::OnceLock;
    use tauri::{AppHandle, Manager, WebviewWindow};

    static APP: OnceLock<AppHandle> = OnceLock::new();

    #[derive(Default)]
    struct UnlockButtonViewIvars;

    define_class!(
        #[unsafe(super(NSView))]
        #[name = "MineradioLyricsUnlockButtonView"]
        #[ivars = UnlockButtonViewIvars]
        struct UnlockButtonView;

        impl UnlockButtonView {
            #[unsafe(method(acceptsFirstMouse:))]
            fn accepts_first_mouse(&self, _event: Option<&NSEvent>) -> bool {
                true
            }

            #[unsafe(method(mouseDown:))]
            fn mouse_down(&self, _event: &NSEvent) {
                if let Some(app) = APP.get() {
                    let state = app.state::<super::RuntimeState>();
                    let _ = super::apply_desktop_lyrics_lock_state(app, &state, false);
                }
            }
        }
    );

    impl UnlockButtonView {
        unsafe fn init_with_frame(
            this: Allocated<Self>,
            frame: objc2_foundation::NSRect,
        ) -> Retained<Self> {
            let this = this.set_ivars(UnlockButtonViewIvars);
            msg_send![super(this), initWithFrame: frame]
        }
    }

    pub fn install(window: &WebviewWindow) -> Result<(), String> {
        let _ = APP.set(window.app_handle().clone());
        window
            .with_webview(|webview| unsafe {
                let ns_window: &objc2_app_kit::NSWindow = &*webview.ns_window().cast();
                let Some(content_view) = ns_window.contentView() else {
                    return;
                };
                let view = UnlockButtonView::init_with_frame(
                    MainThreadMarker::new()
                        .expect("macOS UI must run on the main thread")
                        .alloc(),
                    content_view.bounds(),
                );
                view.setAutoresizingMask(
                    NSAutoresizingMaskOptions::ViewWidthSizable
                        | NSAutoresizingMaskOptions::ViewHeightSizable,
                );
                content_view.addSubview(&view);
            })
            .map_err(|error| error.to_string())
    }
}

#[cfg(target_os = "macos")]
mod macos_touch_bar {
    use base64::Engine;
    use objc2::{
        define_class, msg_send,
        rc::{Allocated, Retained},
        sel, AnyThread, MainThreadOnly,
    };
    use objc2_app_kit::{
        NSButton, NSColor, NSCustomTouchBarItem, NSImage, NSImageView, NSResponder, NSTouchBar,
        NSTouchBarItem, NSView,
    };
    use objc2_foundation::{MainThreadMarker, NSArray, NSData, NSObject, NSSet, NSString};
    use std::{cell::RefCell, sync::OnceLock};
    use tauri::{AppHandle, Emitter, WebviewWindow};

    const LIKE_IDENTIFIER: &str = "com.mineradio.touchbar.like";
    const PREV_IDENTIFIER: &str = "com.mineradio.touchbar.prev";
    const PLAY_IDENTIFIER: &str = "com.mineradio.touchbar.play";
    const NEXT_IDENTIFIER: &str = "com.mineradio.touchbar.next";
    const LYRIC_IDENTIFIER: &str = "com.mineradio.touchbar.lyrics";
    const SMALL_SPACE_IDENTIFIER: &str = "NSTouchBarItemIdentifierFixedSpaceSmall";
    const LARGE_SPACE_IDENTIFIER: &str = "NSTouchBarItemIdentifierFixedSpaceLarge";

    static APP: OnceLock<AppHandle> = OnceLock::new();

    #[derive(Default)]
    struct TouchBarActionTargetIvars;

    define_class!(
        #[unsafe(super(NSObject))]
        #[name = "MineradioTouchBarActionTarget"]
        #[ivars = TouchBarActionTargetIvars]
        struct TouchBarActionTarget;

        impl TouchBarActionTarget {
            #[unsafe(method(performMineradioTouchBarAction:))]
            fn perform_action(&self, sender: &NSButton) {
                let action = match sender.tag() {
                    1 => "toggleLike",
                    2 => "prevTrack",
                    3 => "togglePlay",
                    4 => "nextTrack",
                    _ => return,
                };
                if let Some(app) = APP.get() {
                    let _ = app.emit("mineradio-global-hotkey", serde_json::json!({ "action": action }));
                }
            }
        }
    );

    impl TouchBarActionTarget {
        unsafe fn init(this: Allocated<Self>) -> Retained<Self> {
            let this = this.set_ivars(TouchBarActionTargetIvars);
            msg_send![super(this), init]
        }
    }

    struct TouchBarState {
        _target: Retained<TouchBarActionTarget>,
        like: Retained<NSButton>,
        play: Retained<NSButton>,
        lyric: Retained<NSImageView>,
        _touch_bar: Retained<NSTouchBar>,
    }

    thread_local! {
        static STATE: RefCell<Option<TouchBarState>> = const { RefCell::new(None) };
    }

    fn decode_image(data_url: &str) -> Result<Vec<u8>, String> {
        let encoded = data_url
            .split_once(',')
            .map(|(_, value)| value)
            .filter(|value| !value.is_empty())
            .ok_or("TOUCH_BAR_IMAGE_MISSING")?;
        base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .map_err(|error| error.to_string())
    }

    unsafe fn control_button(
        label: &str,
        tag: isize,
        target: &TouchBarActionTarget,
        mtm: MainThreadMarker,
    ) -> Retained<NSButton> {
        let button = NSButton::buttonWithTitle_target_action(
            &NSString::from_str(label),
            Some(target),
            Some(sel!(performMineradioTouchBarAction:)),
            mtm,
        );
        button.setTag(tag);
        button.setBezelColor(Some(&NSColor::colorWithSRGBRed_green_blue_alpha(
            63.0 / 255.0,
            69.0 / 255.0,
            76.0 / 255.0,
            1.0,
        )));
        button
    }

    unsafe fn custom_item(
        identifier: &str,
        view: &NSView,
        mtm: MainThreadMarker,
    ) -> Retained<NSTouchBarItem> {
        let item = NSCustomTouchBarItem::initWithIdentifier(
            NSCustomTouchBarItem::alloc(mtm),
            &NSString::from_str(identifier),
        );
        item.setView(view);
        item.into_super()
    }

    pub fn update(
        app: &AppHandle,
        window: &WebviewWindow,
        payload: &serde_json::Value,
    ) -> Result<(), String> {
        let data_url = payload
            .get("imageData")
            .and_then(serde_json::Value::as_str)
            .ok_or("TOUCH_BAR_IMAGE_MISSING")?;
        let bytes = decode_image(data_url)?;
        let playing = payload
            .get("playing")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(true);
        let liked = payload
            .get("liked")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);
        let _ = APP.set(app.clone());
        window
            .with_webview(move |webview| unsafe {
                let mtm =
                    MainThreadMarker::new().expect("Touch Bar updates must run on the main thread");
                let data = NSData::with_bytes(&bytes);
                let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) else {
                    return;
                };
                image.setSize(objc2_foundation::NSSize::new(300.0, 30.0));
                STATE.with(|slot| {
                    let mut state = slot.borrow_mut();
                    if state.is_none() {
                        let target = TouchBarActionTarget::init(mtm.alloc());
                        let like = control_button(if liked { "♥" } else { "♡" }, 1, &target, mtm);
                        let prev = control_button("⏮", 2, &target, mtm);
                        let play = control_button(if playing { "⏸" } else { "▶" }, 3, &target, mtm);
                        let next = control_button("⏭", 4, &target, mtm);
                        let lyric = NSImageView::imageViewWithImage(&image, mtm);
                        let items = NSSet::from_retained_slice(&[
                            custom_item(LIKE_IDENTIFIER, &like, mtm),
                            custom_item(PREV_IDENTIFIER, &prev, mtm),
                            custom_item(PLAY_IDENTIFIER, &play, mtm),
                            custom_item(NEXT_IDENTIFIER, &next, mtm),
                            custom_item(LYRIC_IDENTIFIER, &lyric, mtm),
                        ]);
                        let identifiers = NSArray::from_retained_slice(&[
                            NSString::from_str(LIKE_IDENTIFIER),
                            NSString::from_str(SMALL_SPACE_IDENTIFIER),
                            NSString::from_str(PREV_IDENTIFIER),
                            NSString::from_str(SMALL_SPACE_IDENTIFIER),
                            NSString::from_str(PLAY_IDENTIFIER),
                            NSString::from_str(SMALL_SPACE_IDENTIFIER),
                            NSString::from_str(NEXT_IDENTIFIER),
                            NSString::from_str(LARGE_SPACE_IDENTIFIER),
                            NSString::from_str(LYRIC_IDENTIFIER),
                        ]);
                        let touch_bar = NSTouchBar::new(mtm);
                        touch_bar.setTemplateItems(&items);
                        touch_bar.setDefaultItemIdentifiers(&identifiers);
                        *state = Some(TouchBarState {
                            _target: target,
                            like,
                            play,
                            lyric,
                            _touch_bar: touch_bar,
                        });
                    }
                    if let Some(state) = state.as_ref() {
                        state
                            .like
                            .setTitle(&NSString::from_str(if liked { "♥" } else { "♡" }));
                        state.play.setTitle(&NSString::from_str(if playing {
                            "⏸"
                        } else {
                            "▶"
                        }));
                        state.lyric.setImage(Some(&image));
                        let ns_window: &objc2_app_kit::NSWindow = &*webview.ns_window().cast();
                        let webview_responder: &NSResponder = &*webview.inner().cast();
                        webview_responder.setTouchBar(Some(&state._touch_bar));
                        if let Some(content_view) = ns_window.contentView() {
                            content_view.setTouchBar(Some(&state._touch_bar));
                        }
                        // WKWebView installs the generic audio scrubber on a private
                        // WKContentView after playback begins. That object becomes the
                        // window's first responder, so it must be updated after every
                        // possible responder transition instead of only during setup.
                        if let Some(first_responder) = ns_window.firstResponder() {
                            first_responder.setTouchBar(Some(&state._touch_bar));
                        }
                        ns_window.setTouchBar(Some(&state._touch_bar));
                    }
                });
            })
            .map_err(|error| error.to_string())
    }
}

mod analyzer;
mod server;

const BRIDGE: &str = include_str!("bridge.js");
#[cfg(target_os = "macos")]
const QQ_LOGIN_DATA_STORE_ID: [u8; 16] = [
    0x6d, 0x69, 0x6e, 0x65, 0x72, 0x61, 0x64, 0x69, 0x6f, 0x2d, 0x71, 0x71, 0x2d, 0x01, 0x00, 0x01,
];
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
    lyrics_hot_bounds: Mutex<Value>,
    lyrics_unlock_visible: Mutex<bool>,
    wallpaper: Mutex<Value>,
    hotkeys: Mutex<HashMap<String, String>>,
    tray_signature: Mutex<String>,
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

#[cfg(target_os = "macos")]
const MAIN_TRAY_ID: &str = "mineradio-tray";

#[cfg(target_os = "macos")]
fn normalized_tray_text(payload: &Value) -> String {
    payload
        .get("text")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .or_else(|| payload.get("title").and_then(Value::as_str))
        .unwrap_or("Mineradio")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(target_os = "macos")]
fn tray_lyric_title(text: &str, progress: f64) -> String {
    const WIDTH: usize = 18;
    let chars = text.chars().collect::<Vec<_>>();
    if chars.len() <= WIDTH {
        return format!("  {text}");
    }

    let max_start = chars.len() - WIDTH;
    let start = ((progress.clamp(0.0, 1.0) * max_start as f64).round() as usize).min(max_start);
    let mut visible = chars[start..start + WIDTH].to_vec();
    if start > 0 {
        visible[0] = '…';
    }
    if start < max_start {
        visible[WIDTH - 1] = '…';
    }
    format!("  {}", visible.into_iter().collect::<String>())
}

#[cfg(target_os = "macos")]
fn update_macos_tray_lyrics(app: &AppHandle, payload: &Value) -> Result<(), String> {
    let full_text = normalized_tray_text(payload);
    let progress = payload
        .get("progress")
        .and_then(Value::as_f64)
        .unwrap_or(0.0);
    let title = tray_lyric_title(&full_text, progress);
    let signature = format!("{title}\n{full_text}");
    let should_update = {
        let state = app.state::<RuntimeState>();
        let mut last = state.tray_signature.lock().unwrap();
        if *last == signature {
            false
        } else {
            *last = signature;
            true
        }
    };
    if !should_update {
        return Ok(());
    }

    if let Some(tray) = app.tray_by_id(MAIN_TRAY_ID) {
        tray.set_title(Some(title)).map_err(|e| e.to_string())?;
        tray.set_tooltip(Some(format!("Mineradio · {full_text}")))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn emit_tray_playback_action(app: &AppHandle, action: &str) {
    let _ = app.emit("mineradio-global-hotkey", json!({ "action": action }));
}

#[cfg(target_os = "macos")]
fn install_macos_tray(app: &AppHandle) -> Result<(), String> {
    let previous = MenuItem::with_id(app, "tray_previous", "上一首", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let toggle = MenuItem::with_id(app, "tray_toggle", "播放 / 暂停", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let next = MenuItem::with_id(app, "tray_next", "下一首", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let playback_separator = PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?;
    let show = MenuItem::with_id(app, "tray_show", "显示 Mineradio", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let window_separator = PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(app, "tray_quit", "退出 Mineradio", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let menu = Menu::with_items(
        app,
        &[
            &previous,
            &toggle,
            &next,
            &playback_separator,
            &show,
            &window_separator,
            &quit,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut builder = TrayIconBuilder::with_id(MAIN_TRAY_ID)
        .menu(&menu)
        .title("  Mineradio")
        .tooltip("Mineradio")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            if event.id() == "tray_previous" {
                emit_tray_playback_action(app, "prevTrack");
            } else if event.id() == "tray_toggle" {
                emit_tray_playback_action(app, "togglePlay");
            } else if event.id() == "tray_next" {
                emit_tray_playback_action(app, "nextTrack");
            } else if event.id() == "tray_show" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            } else if event.id() == "tray_quit" {
                app.exit(0);
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app).map_err(|e| e.to_string())?;
    Ok(())
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
    let allow_close = Arc::new(AtomicBool::new(false));
    let manual_close_started = Arc::new(AtomicBool::new(false));
    let manual_close_result = Arc::new(Mutex::new(None));
    let window = if let Some(window) = existing {
        let _ = window.show();
        let _ = window.set_focus();
        window
    } else {
        let initial_url = if service == "qq" { "about:blank" } else { url };
        let mut builder = WebviewWindowBuilder::new(
            &app,
            &label,
            WebviewUrl::External(initial_url.parse().unwrap()),
        )
        .title(title)
        .inner_size(1100.0, 760.0)
        .initialization_script(LOGIN_HELPER);
        if service == "qq" {
            let popup_app = app.clone();
            let popup_label = label.clone();
            builder = builder
                .inner_size(900.0, 720.0)
                .on_new_window(move |url, _| {
                    if let Some(login_window) = popup_app.get_webview_window(&popup_label) {
                        tauri::async_runtime::spawn(async move {
                            let _ = login_window.navigate(url);
                        });
                    }
                    tauri::webview::NewWindowResponse::Deny
                });
            #[cfg(target_os = "macos")]
            {
                builder = builder.data_store_identifier(QQ_LOGIN_DATA_STORE_ID);
            }
            #[cfg(not(target_os = "macos"))]
            if let Ok(dir) = app.path().app_data_dir() {
                builder = builder.data_directory(dir.join("qq-login-webview"));
            }
        }
        builder.build().map_err(|e| e.to_string())?
    };
    if service == "qq" {
        let close_window = window.clone();
        let close_allowed = allow_close.clone();
        let close_started = manual_close_started.clone();
        let close_result = manual_close_result.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if close_allowed.load(Ordering::Acquire) {
                    return;
                }
                api.prevent_close();
                if close_started.swap(true, Ordering::AcqRel) {
                    return;
                }
                let close_window = close_window.clone();
                let close_allowed = close_allowed.clone();
                let close_result = close_result.clone();
                tauri::async_runtime::spawn(async move {
                    let result = match close_window.cookies() {
                        Ok(cookies) => {
                            let header = cookie_header("qq", cookies);
                            if cookie_has_login("qq", &header) {
                                json!({ "ok": true, "cookie": header })
                            } else {
                                json!({ "ok": false, "cancelled": true, "message": "未获得 QQ 音乐播放授权，原登录未被覆盖" })
                            }
                        }
                        Err(error) => json!({ "ok": false, "error": error.to_string() }),
                    };
                    *close_result.lock().unwrap() = Some(result);
                    close_allowed.store(true, Ordering::Release);
                    let _ = close_window.close();
                });
            }
        });
    }
    if is_new && service == "qq" {
        let _ = window.clear_all_browsing_data();
        let _ = window.navigate(url.parse().unwrap());
    }
    let mut qq_warmup_started = false;
    for _ in 0..300 {
        if let Some(result) = manual_close_result.lock().unwrap().take() {
            return Ok(result);
        }
        if app.get_webview_window(&label).is_none() {
            let message = if service == "qq" {
                "未获得 QQ 音乐播放授权，原登录未被覆盖"
            } else {
                "登录窗口已关闭"
            };
            return Ok(json!({ "ok": false, "cancelled": true, "message": message }));
        }
        if let Ok(cookies) = window.cookies() {
            let header = cookie_header(&service, cookies);
            if cookie_has_login(&service, &header) {
                allow_close.store(true, Ordering::Release);
                let _ = window.close();
                return Ok(json!({ "ok": true, "cookie": header }));
            }
            if service == "qq" && !qq_warmup_started && qq_cookie_has_auth(&header) {
                qq_warmup_started = true;
                let warmup_window = window.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(Duration::from_millis(900)).await;
                    let _ =
                        warmup_window.navigate("https://y.qq.com/n/ryqq/player".parse().unwrap());
                });
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
    let filtered = cookies
        .into_iter()
        .filter(|cookie| cookie_domain_allowed(service, cookie.domain()))
        .filter(|cookie| !cookie.value().is_empty())
        .map(|cookie| format!("{}={}", cookie.name(), cookie.value()))
        .collect::<Vec<_>>();
    if service != "qq" {
        return filtered.join("; ");
    }

    const PRIORITY: &[&str] = &[
        "uin",
        "qqmusic_uin",
        "wxuin",
        "login_type",
        "qm_keyst",
        "qqmusic_key",
        "p_skey",
        "skey",
        "psrf_qqopenid",
        "psrf_qqunionid",
        "psrf_qqaccess_token",
        "psrf_qqrefresh_token",
        "wxopenid",
        "wxunionid",
        "wxrefresh_token",
        "wxskey",
        "p_uin",
        "ptcz",
        "RK",
    ];
    let mut pairs = Vec::<(String, String)>::new();
    for item in filtered {
        let Some((name, value)) = item.split_once('=') else {
            continue;
        };
        if let Some(existing) = pairs.iter_mut().find(|(key, _)| key == name) {
            existing.1 = value.to_owned();
        } else {
            pairs.push((name.to_owned(), value.to_owned()));
        }
    }
    pairs.sort_by_key(|(name, _)| {
        PRIORITY
            .iter()
            .position(|candidate| candidate == name)
            .unwrap_or(PRIORITY.len())
    });
    pairs
        .into_iter()
        .map(|(name, value)| format!("{name}={value}"))
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
            let uin = qq_cookie_uin(header);
            let key = cookie_value(header, "qm_keyst")
                .or_else(|| cookie_value(header, "qqmusic_key"))
                .or_else(|| cookie_value(header, "music_key"))
                .or_else(|| cookie_value(header, "wxskey"));
            !uin.is_empty() && key.is_some_and(|value| !value.is_empty())
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

fn qq_cookie_uin(header: &str) -> String {
    let raw = if cookie_value(header, "login_type") == Some("2") {
        cookie_value(header, "wxuin")
            .or_else(|| cookie_value(header, "uin"))
            .or_else(|| cookie_value(header, "p_uin"))
    } else {
        cookie_value(header, "uin")
            .or_else(|| cookie_value(header, "qqmusic_uin"))
            .or_else(|| cookie_value(header, "wxuin"))
            .or_else(|| cookie_value(header, "p_uin"))
    };
    raw.unwrap_or_default()
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>()
}

fn qq_cookie_has_auth(header: &str) -> bool {
    let account = qq_cookie_uin(header);
    let auth = cookie_value(header, "qm_keyst")
        .or_else(|| cookie_value(header, "qqmusic_key"))
        .or_else(|| cookie_value(header, "music_key"))
        .or_else(|| cookie_value(header, "p_skey"))
        .or_else(|| cookie_value(header, "skey"))
        .or_else(|| cookie_value(header, "psrf_qqaccess_token"))
        .or_else(|| cookie_value(header, "psrf_qqrefresh_token"))
        .or_else(|| cookie_value(header, "wxrefresh_token"))
        .or_else(|| cookie_value(header, "wxskey"));
    !account.is_empty() && auth.is_some_and(|value| !value.is_empty())
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

fn music_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map(|dir| dir.join("beatmaps"))
        .map_err(|error| error.to_string())?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    }
    let metadata = fs::symlink_metadata(&dir).map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err("UNSAFE_MUSIC_CACHE_DIRECTORY".into());
    }
    Ok(dir)
}

fn music_cache_entries(dir: &Path) -> Result<Vec<(PathBuf, u64)>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let file_type = entry.file_type().map_err(|error| error.to_string())?;
        let path = entry.path();
        let is_json = path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("json"));
        if file_type.is_file() && is_json {
            let bytes = entry.metadata().map(|metadata| metadata.len()).unwrap_or(0);
            entries.push((path, bytes));
        }
    }
    Ok(entries)
}

#[tauri::command]
fn get_music_cache_info(app: AppHandle) -> Result<Value, String> {
    let dir = music_cache_dir(&app)?;
    let entries = music_cache_entries(&dir)?;
    let bytes: u64 = entries.iter().map(|(_, bytes)| bytes).sum();
    Ok(json!({
        "ok": true,
        "directory": dir.to_string_lossy(),
        "fileCount": entries.len(),
        "bytes": bytes,
    }))
}

#[tauri::command]
fn open_music_cache_directory(app: AppHandle) -> Result<Value, String> {
    let dir = music_cache_dir(&app)?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|error| error.to_string())?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn clear_music_cache(app: AppHandle) -> Result<Value, String> {
    let dir = music_cache_dir(&app)?;
    let entries = music_cache_entries(&dir)?;
    let mut cleared_bytes = 0;
    let mut cleared_files = 0;
    for (path, bytes) in entries {
        fs::remove_file(path).map_err(|error| error.to_string())?;
        cleared_bytes += bytes;
        cleared_files += 1;
    }
    Ok(json!({
        "ok": true,
        "directory": dir.to_string_lossy(),
        "clearedFiles": cleared_files,
        "clearedBytes": cleared_bytes,
    }))
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
    let app_to_exit = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(900)).await;
        app_to_exit.exit(0);
    });
    Ok(json!({ "ok": true, "willExit": true }))
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
        .always_on_top(label == "desktop-lyrics" || label == "desktop-lyrics-unlock")
        .initialization_script(BRIDGE);
    if label == "desktop-lyrics" {
        builder = builder
            .inner_size(920.0, 190.0)
            .resizable(false)
            .focusable(false)
            .focused(false)
            .visible(false)
            .visible_on_all_workspaces(true);
    } else if label == "desktop-lyrics-unlock" {
        builder = builder
            .inner_size(132.0, 36.0)
            .resizable(false)
            .focusable(false)
            .focused(false)
            .visible(false)
            .visible_on_all_workspaces(true);
    }
    let window = builder.build().map_err(|e| e.to_string())?;
    if label == "desktop-lyrics" {
        configure_desktop_lyrics_window(&window)?;
    } else if label == "desktop-lyrics-unlock" {
        configure_desktop_lyrics_unlock_window(&window)?;
    }
    Ok(window)
}

fn position_desktop_lyrics_unlock_window(
    app: &AppHandle,
    lyrics: &WebviewWindow,
    unlock: &WebviewWindow,
) {
    let Ok(position) = lyrics.outer_position() else {
        return;
    };
    let Ok(size) = lyrics.outer_size() else {
        return;
    };
    let Ok(scale) = lyrics.scale_factor() else {
        return;
    };
    let bounds = app
        .state::<RuntimeState>()
        .lyrics_hot_bounds
        .lock()
        .unwrap()
        .clone();
    let action_left = lyrics_hot_bound(&bounds, "unlockLeft");
    let action_top = lyrics_hot_bound(&bounds, "unlockTop");
    let action_right = lyrics_hot_bound(&bounds, "unlockRight");
    let action_bottom = lyrics_hot_bound(&bounds, "unlockBottom");
    let width = action_left
        .zip(action_right)
        .map(|(left, right)| ((right - left).max(92.0) * scale).round() as u32)
        .unwrap_or_else(|| (104.0 * scale).round() as u32);
    let height = action_top
        .zip(action_bottom)
        .map(|(top, bottom)| ((bottom - top).max(30.0) * scale).round() as u32)
        .unwrap_or_else(|| (32.0 * scale).round() as u32);
    let x = action_left
        .map(|left| position.x + (left * scale).round() as i32)
        .unwrap_or_else(|| position.x + (size.width as i32 - width as i32) / 2);
    let y = action_top
        .map(|top| position.y + (top * scale).round() as i32)
        .unwrap_or(position.y + (72.0 * scale).round() as i32);
    let _ = unlock.set_size(tauri::PhysicalSize::new(width, height));
    let _ = unlock.set_position(PhysicalPosition::new(x, y));
}

fn sync_desktop_lyrics_unlock_window(app: &AppHandle, locked: bool) -> Result<(), String> {
    *app.state::<RuntimeState>()
        .lyrics_unlock_visible
        .lock()
        .unwrap() = false;
    if !locked {
        if let Some(window) = app.get_webview_window("desktop-lyrics-unlock") {
            let _ = window.hide();
        }
        return Ok(());
    }
    let Some(lyrics) = app.get_webview_window("desktop-lyrics") else {
        return Ok(());
    };
    let unlock = overlay_window(
        app,
        "desktop-lyrics-unlock",
        "desktop-lyrics-unlock.html",
        true,
    )?;
    position_desktop_lyrics_unlock_window(app, &lyrics, &unlock);
    let _ = unlock.hide();
    Ok(())
}

fn lyrics_hot_bound(value: &Value, key: &str) -> Option<f64> {
    value
        .get(key)
        .and_then(Value::as_f64)
        .filter(|value| value.is_finite())
}

fn set_desktop_lyrics_unlock_visible(app: &AppHandle, visible: bool) {
    let state = app.state::<RuntimeState>();
    let mut current = state.lyrics_unlock_visible.lock().unwrap();
    if *current == visible {
        return;
    }
    let Some(unlock) = app.get_webview_window("desktop-lyrics-unlock") else {
        *current = false;
        return;
    };
    *current = visible;
    drop(current);
    if visible {
        if let Some(lyrics) = app.get_webview_window("desktop-lyrics") {
            position_desktop_lyrics_unlock_window(app, &lyrics, &unlock);
        }
        let _ = show_desktop_lyrics_window(&unlock);
    } else {
        let _ = unlock.hide();
    }
}

fn update_desktop_lyrics_unlock_hover(app: &AppHandle) {
    let state = app.state::<RuntimeState>();
    if !desktop_lyrics_enabled(&state) {
        set_desktop_lyrics_unlock_visible(app, false);
        return;
    }
    if !desktop_lyrics_locked(&state) {
        set_desktop_lyrics_unlock_visible(app, false);
        return;
    }
    let Some(lyrics) = app.get_webview_window("desktop-lyrics") else {
        return;
    };
    let Some(unlock) = app.get_webview_window("desktop-lyrics-unlock") else {
        return;
    };
    let Ok(cursor) = app.cursor_position() else {
        return;
    };
    let Ok(position) = lyrics.outer_position() else {
        return;
    };
    let Ok(scale) = lyrics.scale_factor() else {
        return;
    };
    let bounds = state.lyrics_hot_bounds.lock().unwrap().clone();
    let (Some(left), Some(top), Some(right), Some(bottom)) = (
        lyrics_hot_bound(&bounds, "left"),
        lyrics_hot_bound(&bounds, "top"),
        lyrics_hot_bound(&bounds, "right"),
        lyrics_hot_bound(&bounds, "bottom"),
    ) else {
        return;
    };
    let hot_left = position.x as f64 + left * scale;
    let hot_top = position.y as f64 + top * scale;
    let hot_right = position.x as f64 + right * scale;
    let hot_bottom = position.y as f64 + bottom * scale;
    let inside_hot = cursor.x >= hot_left
        && cursor.x <= hot_right
        && cursor.y >= hot_top
        && cursor.y <= hot_bottom;
    let currently_visible = *state.lyrics_unlock_visible.lock().unwrap();
    let inside_path = if currently_visible {
        match (unlock.outer_position(), unlock.outer_size()) {
            (Ok(unlock_position), Ok(unlock_size)) => {
                let pad = 8.0 * scale;
                cursor.x >= hot_left.min(unlock_position.x as f64) - pad
                    && cursor.x
                        <= hot_right.max(unlock_position.x as f64 + unlock_size.width as f64) + pad
                    && cursor.y >= (unlock_position.y as f64 - pad)
                    && cursor.y <= hot_bottom + pad
            }
            _ => false,
        }
    } else {
        false
    };
    set_desktop_lyrics_unlock_visible(app, inside_hot || inside_path);
}

fn start_desktop_lyrics_hover_monitor(app: AppHandle) {
    thread::spawn(move || loop {
        let enabled = desktop_lyrics_enabled(&app.state::<RuntimeState>());
        if enabled {
            update_desktop_lyrics_unlock_hover(&app);
        } else {
            set_desktop_lyrics_unlock_visible(&app, false);
        }
        thread::sleep(Duration::from_millis(if enabled { 70 } else { 500 }));
    });
}

fn position_desktop_lyrics_window(window: &WebviewWindow, payload: &Value) {
    let Some(monitor) = window.primary_monitor().ok().flatten() else {
        return;
    };
    let area = monitor.size();
    let origin = monitor.position();
    let scale = monitor.scale_factor();
    let logical_width = area.width as f64 / scale;
    let logical_height = area.height as f64 / scale;
    let width = 920.0_f64.min((logical_width - 64.0).max(480.0)) * scale;
    let height = 190.0_f64.min((logical_height - 64.0).max(120.0)) * scale;
    let y_ratio = payload
        .get("y")
        .and_then(Value::as_f64)
        .unwrap_or(0.76)
        .clamp(0.08, 0.92);
    let x = origin.x as f64 + (area.width as f64 - width) / 2.0;
    let y = origin.y as f64 + area.height as f64 * y_ratio - height / 2.0;
    let _ = window.set_size(tauri::PhysicalSize::new(
        width.round() as u32,
        height.round() as u32,
    ));
    let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
}

#[cfg(target_os = "macos")]
fn configure_desktop_lyrics_window(window: &WebviewWindow) -> Result<(), String> {
    use objc2_app_kit::{NSScreenSaverWindowLevel, NSWindowCollectionBehavior};
    window
        .with_webview(|webview| unsafe {
            let ns_window: &objc2_app_kit::NSWindow = &*webview.ns_window().cast();
            ns_window.setLevel(NSScreenSaverWindowLevel);
            ns_window.setCollectionBehavior(
                NSWindowCollectionBehavior::CanJoinAllSpaces
                    | NSWindowCollectionBehavior::FullScreenAuxiliary
                    | NSWindowCollectionBehavior::Stationary,
            );
            ns_window.setOpaque(false);
            ns_window.setHasShadow(false);
            ns_window.setIgnoresMouseEvents(true);
        })
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn configure_desktop_lyrics_unlock_window(window: &WebviewWindow) -> Result<(), String> {
    use objc2_app_kit::{NSScreenSaverWindowLevel, NSWindowCollectionBehavior};
    window
        .with_webview(|webview| unsafe {
            let ns_window: &objc2_app_kit::NSWindow = &*webview.ns_window().cast();
            ns_window.setLevel(NSScreenSaverWindowLevel);
            ns_window.setCollectionBehavior(
                NSWindowCollectionBehavior::CanJoinAllSpaces
                    | NSWindowCollectionBehavior::FullScreenAuxiliary
                    | NSWindowCollectionBehavior::Stationary,
            );
            ns_window.setOpaque(false);
            ns_window.setHasShadow(false);
            ns_window.setIgnoresMouseEvents(false);
        })
        .map_err(|error| error.to_string())?;
    macos_desktop_lyrics_unlock_button::install(window)
}

#[cfg(not(target_os = "macos"))]
fn configure_desktop_lyrics_window(_window: &WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn configure_desktop_lyrics_unlock_window(_window: &WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "macos")]
fn show_desktop_lyrics_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .with_webview(|webview| unsafe {
            let ns_window: &objc2_app_kit::NSWindow = &*webview.ns_window().cast();
            ns_window.orderFrontRegardless();
        })
        .map_err(|error| error.to_string())
}

#[cfg(not(target_os = "macos"))]
fn show_desktop_lyrics_window(window: &WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
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
        position_desktop_lyrics_window(&window, &value);
        let _ = window.set_ignore_cursor_events(
            value
                .get("clickThrough")
                .and_then(Value::as_bool)
                .unwrap_or(true),
        );
        show_desktop_lyrics_window(&window)?;
        let _ = window.emit("mineradio-desktop-lyrics-state", value);
        sync_desktop_lyrics_unlock_window(&app, desktop_lyrics_locked(&state))?;
    } else {
        if let Some(window) = app.get_webview_window("desktop-lyrics") {
            let _ = window.close();
        }
        if let Some(unlock) = app.get_webview_window("desktop-lyrics-unlock") {
            let _ = unlock.close();
        }
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
    let was_locked = desktop_lyrics_locked(&state);
    let value = merge_state(&state.lyrics, payload, None);
    if value
        .get("enabled")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        let window = overlay_window(&app, "desktop-lyrics", "desktop-lyrics.html", true)?;
        let locked = value
            .get("clickThrough")
            .and_then(Value::as_bool)
            .unwrap_or(true);
        if locked != was_locked {
            window
                .set_ignore_cursor_events(locked)
                .map_err(|e| e.to_string())?;
            sync_desktop_lyrics_unlock_window(&app, locked)?;
        }
        let _ = window.emit("mineradio-desktop-lyrics-state", value);
    }
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn get_desktop_lyrics_state(state: State<RuntimeState>) -> Value {
    state.lyrics.lock().unwrap().clone()
}

fn desktop_lyrics_locked(state: &RuntimeState) -> bool {
    state
        .lyrics
        .lock()
        .unwrap()
        .get("clickThrough")
        .and_then(Value::as_bool)
        .unwrap_or(true)
}

fn desktop_lyrics_enabled(state: &RuntimeState) -> bool {
    state
        .lyrics
        .lock()
        .unwrap()
        .get("enabled")
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

#[tauri::command]
fn update_touch_bar_lyrics(app: AppHandle, payload: Value) -> Result<Value, String> {
    #[cfg(target_os = "macos")]
    {
        update_macos_tray_lyrics(&app, &payload)?;
        macos_touch_bar::update(&app, &main_window(&app)?, &payload)?;
        return Ok(json!({ "ok": true, "supported": true }));
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, payload);
        Ok(json!({ "ok": true, "supported": false }))
    }
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
fn set_lyrics_pointer_capture(
    app: AppHandle,
    state: State<RuntimeState>,
    active: bool,
) -> Result<Value, String> {
    let locked = desktop_lyrics_locked(&state);
    if let Some(window) = app.get_webview_window("desktop-lyrics") {
        // Electron's `{ forward: true }` keeps delivering hover events while a
        // window is click-through. Tauri/AppKit has no equivalent; disabling
        // capture while unlocked would therefore make the window impossible
        // to enter again. An unlocked lyrics window must remain interactive.
        window
            .set_ignore_cursor_events(locked)
            .map_err(|e| e.to_string())?;
    }
    Ok(json!({ "ok": true, "active": active, "locked": locked }))
}

#[tauri::command]
fn set_lyrics_hot_bounds(state: State<RuntimeState>, bounds: Value) -> Value {
    *state.lyrics_hot_bounds.lock().unwrap() = bounds;
    json!({ "ok": true })
}

#[tauri::command]
fn set_lyrics_lock_state(
    app: AppHandle,
    state: State<RuntimeState>,
    locked: bool,
) -> Result<Value, String> {
    apply_desktop_lyrics_lock_state(&app, &state, locked)
}

fn apply_desktop_lyrics_lock_state(
    app: &AppHandle,
    state: &RuntimeState,
    locked: bool,
) -> Result<Value, String> {
    merge_state(&state.lyrics, json!({ "clickThrough": locked }), None);
    if let Some(window) = app.get_webview_window("desktop-lyrics") {
        window
            .set_ignore_cursor_events(locked)
            .map_err(|e| e.to_string())?;
    }
    sync_desktop_lyrics_unlock_window(app, locked)?;
    let _ = app.emit(
        "mineradio-desktop-lyrics-lock-state",
        json!({ "locked": locked }),
    );
    Ok(json!({ "ok": true, "locked": locked }))
}

#[tauri::command]
fn move_lyrics_by(
    app: AppHandle,
    state: State<RuntimeState>,
    dx: f64,
    dy: f64,
) -> Result<Value, String> {
    if desktop_lyrics_locked(&state) {
        return Err("DESKTOP_LYRICS_LOCKED".into());
    }
    let window = app
        .get_webview_window("desktop-lyrics")
        .ok_or("NO_DESKTOP_LYRICS_WINDOW")?;
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(
            pos.x + (dx.clamp(-160.0, 160.0) * scale).round() as i32,
            pos.y + (dy.clamp(-160.0, 160.0) * scale).round() as i32,
        ))
        .map_err(|e| e.to_string())?;
    Ok(json!({ "ok": true }))
}

fn start_rust_server(app: &AppHandle, state: &RuntimeState) -> Result<u16, String> {
    // Keep the frontend origin stable so WebView localStorage survives restarts.
    let listener = TcpListener::bind(("127.0.0.1", 47865))
        .or_else(|_| TcpListener::bind(("127.0.0.1", 0)))
        .map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    eprintln!("Mineradio Rust server listening on 127.0.0.1:{port}");
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&data).map_err(|e| e.to_string())?;
    let library = local_library::paths(app)?;
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
                user_settings: data.join("user-settings.json"),
                beat_cache: data.join("beatmaps"),
                updates: data.join("updates"),
                library_database: library.database,
                library_media: library.media,
                library_covers: library.covers,
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
    let max_width = (size.width - 32.0).max(960.0);
    let max_height = (size.height - 32.0).max(540.0);
    let width = (size.width * 0.75).clamp(960.0, max_width);
    let height = (width * 9.0 / 16.0).clamp(540.0, max_height);
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
        let mtm = objc2_foundation::MainThreadMarker::new()
            .ok_or("MAIN_WEBVIEW_MUST_BE_CREATED_ON_MAIN_THREAD")?;
        let configuration = unsafe { objc2_web_kit::WKWebViewConfiguration::new(mtm) };
        unsafe {
            configuration.setMediaTypesRequiringUserActionForPlayback(
                objc2_web_kit::WKAudiovisualMediaTypes::None,
            );
        }
        builder = builder
            .with_webview_configuration(configuration)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    let window = builder.build().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    macos_window_drag::install(&window)?;
    emit_window_state(&window);
    Ok(window)
}

pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tauri::Builder::default()
        .manage(RuntimeState::default())
        .menu(|app| {
            let menu = Menu::default(app)?;
            #[cfg(target_os = "macos")]
            if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
                let check_for_updates = MenuItem::with_id(
                    app,
                    "check_for_updates",
                    "Check for Updates…",
                    true,
                    None::<&str>,
                )?;
                app_menu.insert(&check_for_updates, 1)?;
            }
            Ok(menu)
        })
        .on_menu_event(|app, event| {
            if event.id() == "check_for_updates" {
                let _ = app.emit("mineradio-check-for-updates", ());
            }
        })
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
            get_music_cache_info,
            open_music_cache_directory,
            clear_music_cache,
            open_update_installer,
            restart_app,
            configure_global_hotkeys,
            export_json_file,
            import_json_file,
            set_desktop_lyrics_enabled,
            update_desktop_lyrics,
            get_desktop_lyrics_state,
            update_touch_bar_lyrics,
            set_wallpaper_mode,
            update_wallpaper_mode,
            set_lyrics_pointer_capture,
            set_lyrics_hot_bounds,
            set_lyrics_lock_state,
            move_lyrics_by,
            local_library::library_snapshot,
            local_library::library_import_files,
            local_library::library_import_folder,
            local_library::library_create_playlist,
            local_library::library_rename_playlist,
            local_library::library_delete_playlist,
            local_library::library_delete_track,
            local_library::library_set_heart,
            local_library::library_toggle_playlist_track,
            local_library::library_save_queue,
            local_library::library_import_lx_file,
            local_library::library_import_remote_playlist
        ])
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let _ = webview.eval(BRIDGE);
            }
        })
        .setup(|app| {
            let port = start_rust_server(app.handle(), &app.state::<RuntimeState>())?;
            if !wait_for_server(port) {
                return Err("Rust API server startup timed out".into());
            }
            #[cfg(target_os = "macos")]
            install_macos_tray(app.handle())?;
            create_main_window(app.handle(), port)?;
            start_desktop_lyrics_hover_monitor(app.handle().clone());
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qq_account_auth_does_not_complete_without_playback_key() {
        let partial = "uin=o0012345; p_skey=account-auth";
        assert!(qq_cookie_has_auth(partial));
        assert!(!cookie_has_login("qq", partial));

        let complete = "uin=o0012345; qm_keyst=playback-auth";
        assert!(qq_cookie_has_auth(complete));
        assert!(cookie_has_login("qq", complete));
    }
}
