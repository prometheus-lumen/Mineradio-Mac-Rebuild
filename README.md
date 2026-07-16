# Mineradio 二创重构版

这是基于 [XxHuberrr/Mineradio](https://github.com/XxHuberrr/Mineradio)
制作的非官方 macOS 二创与技术重构版本。

本项目正式名称为 **Mineradio 二创重构版**，不是 Mineradio 原版，也不代表
原作者发布、维护或提供技术支持。安装包、应用标题和发布说明均应使用完整名称，
避免与原版混淆。

## 项目定位

本仓库的开发、官方构建和维护支持仅面向：

- 个人学习；
- 技术研究；
- 本地测试；
- 个人非商业体验。

请勿利用本项目侵犯音乐、歌词、专辑封面、字体、账号数据、平台接口、商标或
其他第三方权利。本项目与网易云音乐、QQ 音乐、酷狗音乐及其他音乐平台不存在
官方关联或背书。

## 许可证说明

Mineradio 原版采用 **GNU GPL version 3**。本项目作为修改与移植版本，受 GPL
覆盖的代码继续按 GPL-3.0 分发。

需要特别说明：GPL-3.0 本身允许商业使用和收费分发，因此“仅供个人非商业学习”
是本仓库的项目定位和官方支持范围，不是对 GPL 代码追加的新法律限制。

修改或再分发时必须：

- 保留原作者、修改者、版权、来源和许可证说明；
- 明确标注为非官方修改版本；
- 不得冒充 Mineradio 原版或原作者官方发布；
- 继续按 GPL-3.0 分发 GPL 覆盖的衍生代码；
- 按 GPL 要求提供对应源代码。

完整说明见 [LICENSE](LICENSE) 和
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 音域回响

“音域回响”参考并改编自
[yin-yizhen/sonic-topography](https://github.com/yin-yizhen/sonic-topography)，
用于学习、研究和个人非商业体验。

其许可与 Mineradio 原版 GPL-3.0 不同。公开分发包含该改编代码的源码或安装包
前，应取得 Sonic Topography 原作者对公开再分发及许可证兼容性的明确书面授权；
否则应从公开版本中移除或改为独立实现。

原始许可见
[`docs/licenses/sonic-topography.txt`](docs/licenses/sonic-topography.txt)。

## 技术结构

- Tauri 2：桌面窗口与系统能力；
- Rust / Axum：本地 API、音乐源、代理、缓存和音频分析；
- Vite / TypeScript：前端构建；
- Three.js：视觉渲染。

前端源码位于 `public/` 与 `src/frontend/`，Rust 后端位于 `src-tauri/`。

## 本地开发

准备 Node.js、npm、Rust 和 Xcode Command Line Tools：

本目录是 Mineradio 的 Tauri 2 原生重构。Tauri 负责桌面窗口与系统集成，Rust/Axum 提供本地 API、三家音乐源、登录 Cookie、更新、代理、缓存和音频分析。应用不再启动或打包 Node。前端源码位于 `public/` 与 `src/frontend/`，桌面能力通过 `src-tauri/src/bridge.js` 保持原 `window.desktopWindow` / `window.desktopOverlay` 接口。

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

只检查和构建前端：

```bash
npm run typecheck
npm run build:frontend
```

检查 Rust：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## macOS 打包

修改 `package.json` 中的版本号后同步版本：

```bash
npm run version:sync
```

同时构建 Intel x64 和 Apple Silicon arm64：

```bash
npm run build:mac
```

只构建单一架构：

```bash
npm run build:mac:x64
npm run build:mac:arm64
```

标准 DMG 打包时，Tauri 会短暂挂载镜像并打开 Finder，以写入背景和图标位置；这不是在安装应用。若不希望出现 Finder 窗口，可以使用静默打包，但生成的 DMG 会跳过自定义背景和图标定位：

```bash
npm run build:mac:quiet
```

最终发布文件位于：

```text
dist/release/v<版本号>/
```

安装包文件名使用 `Mineradio-Rebuild_<版本>_<架构>.dmg`，应用名称为
`Mineradio 二创重构版.app`。

如果两个架构的当前版本 DMG 已经存在，只重新生成更新清单：

```bash
npm run version:sync
```

无法打开未签名安装包时，可参考：
[macOS 安装说明](https://github.com/prometheus-lumen/Mineradio-MacOS/blob/main/README.md)。

## 免责声明

软件按“现状”提供，不承诺可用性、账号安全、数据安全、平台兼容性或持续维护。
使用第三方音乐服务造成的账号限制、内容纠纷、数据损失或其他后果由使用者自行
承担。
