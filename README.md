# 关于无法安装问题解答请移步至该文档
https://github.com/prometheus-lumen/Mineradio-MacOS/blob/main/README.md
# Mineradio Tauri 2 / Rust 重构

本目录是 Mineradio 的 Tauri 2 原生重构。Tauri 负责桌面窗口与系统集成，Rust/Axum 提供本地 API、三家音乐源、登录 Cookie、更新、代理、缓存和音频分析。应用不再启动或打包 Node。原项目的 `public/` 完整复制且不修改视觉代码，桌面能力通过 `src-tauri/src/bridge.js` 保持原 `window.desktopWindow` / `window.desktopOverlay` 接口。

## 本地验证

```bash
source "$HOME/.cargo/env"
cargo check --manifest-path src-tauri/Cargo.toml
cargo run --manifest-path src-tauri/Cargo.toml
```

也可以使用 Tauri 开发模式：

```bash
npm install
npm run dev
```

前端现由 Vite 输出单一 ESM 应用入口；`npm run build:frontend` 会先执行严格类型检查，再生成由 Tauri/Rust 服务实际加载的 `dist/frontend/`。`npm run dev:frontend` 可单独预览界面，但 `/api/*` 仍需由 Tauri 启动的 Rust 服务提供。迁移期按原 HTML 清单保持源码初始化顺序，避免一次性改写共享运行时；新增代码应优先使用模块导出，并通过应用生命周期注册可解绑事件。

## macOS DMG 打包

打包机需要安装 Xcode Command Line Tools、Node.js、npm、Rust 和 Tauri 所需的 macOS 工具。首次执行会自动安装缺少的 Rust 编译目标。

一次生成 Intel x64 与 Apple Silicon arm64 两个标准 DMG：

```bash
npm run build:mac
```

也可以只生成单一架构：

```bash
npm run build:mac:x64
npm run build:mac:arm64
```

标准 DMG 打包时，Tauri 会短暂挂载镜像并打开 Finder，以写入背景和图标位置；这不是在安装应用。若不希望出现 Finder 窗口，可以使用静默打包，但生成的 DMG 会跳过自定义背景和图标定位：

```bash
npm run build:mac:quiet
```

用于上传 GitHub Release 的最终产物位置：

```text
dist/release/v<版本号>/
```

目录中会包含已构建的 DMG 和自动生成的 `Mineradio-update.json`，将它们一起上传到对应的 `v<版本号>` Release 即可。原始 DMG 仍保留在 `src-tauri/target/release/bundle/dmg/` 或 `src-tauri/target/<架构>/release/bundle/dmg/`。

版本号只需要修改根目录 `package.json` 的 `version`。打包命令会先运行 `npm run version:sync`，自动同步 `package-lock.json`、Cargo、Tauri 配置和更新界面的回退版本。也可以在不打包时手动执行：

```bash
npm run version:sync
```

脚本调用 Tauri 自带的 DMG bundler，安装盘会包含 `Mineradio.app`、`Applications` 快捷方式和标准拖拽安装布局。用于 GitHub Release 前建议配置 Apple Developer 签名和公证；未签名包在其他 Mac 上可能需要用户在“隐私与安全性”中确认打开。

## 迁移边界

- `public/`：HTML、样式、vendor 与静态资源源目录。
- `src/frontend/`：TypeScript 前端源码，由 Vite 组合为 ESM 产物。
- `src-tauri/src/server.rs`：原生本地 HTTP/API 服务。
- `src-tauri/src/analyzer.rs`：Symphonia 解码和原生节拍分析。
- `src-tauri/src/lib.rs`：窗口、IPC、快捷键、登录 WebView、导入导出、更新安装器、桌面歌词和壁纸窗口。
- `src-tauri/src/bridge.js`：Electron preload API 的 Tauri 兼容层。

`public/` 不改接口和页面行为；Rust 服务保持原 `/api/*` 路由集合。
