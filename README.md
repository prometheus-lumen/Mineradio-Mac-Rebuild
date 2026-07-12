# Mineradio Tauri 2 / Rust 重构

本目录是 Mineradio 的 Tauri 2 原生重构。Tauri 负责桌面窗口与系统集成，Rust/Axum 提供本地 API、三家音乐源、登录 Cookie、更新、代理、缓存和音频分析。应用不再启动或打包 Node。原项目的 `public/` 完整复制且不修改视觉代码，桌面能力通过 `src-tauri/src/bridge.js` 保持原 `window.desktopWindow` / `window.desktopOverlay` 接口。

## 本地验证

```bash
source "$HOME/.cargo/env"
cargo check --manifest-path src-tauri/Cargo.toml
cargo run --manifest-path src-tauri/Cargo.toml
```

## 迁移边界

- `public/`：保持原文件不变。
- `src-tauri/src/server.rs`：原生本地 HTTP/API 服务。
- `src-tauri/src/analyzer.rs`：Symphonia 解码和原生节拍分析。
- `src-tauri/src/lib.rs`：窗口、IPC、快捷键、登录 WebView、导入导出、更新安装器、桌面歌词和壁纸窗口。
- `src-tauri/src/bridge.js`：Electron preload API 的 Tauri 兼容层。

`public/` 不改接口和页面行为；Rust 服务保持原 `/api/*` 路由集合。
