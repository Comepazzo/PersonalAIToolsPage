# PersonalAIToolsPage


[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

### Overview
This is a desktop application built with **Electron + Vite + React** that integrates multiple AI web services (ChatGPT, Gemini, Tongyi Qianwen, DeepSeek, etc.) into a unified interface. It allows users to interact with multiple AIs simultaneously using a single input box, supporting text and image transmission.

### Supported Platforms
-   **Windows**: Fully supported and tested.
-   **Linux**: Supported (AppImage, deb).
-   **macOS**: Supported (DMG).

### Build & Release
1.  **Install Dependencies**
    ```bash
    npm install
    ```
2.  **Development**
    ```bash
    npm run dev
    ```
3.  **Build**
    > **Tip for China Users**: If you encounter download timeouts, please set the mirror environment variables before building:
    >
    > **Windows (PowerShell)**:
    > ```powershell
    > $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
    > $env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
    > npm run build
    > ```
    >
    > **macOS / Linux**:
    > ```bash
    > export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
    > export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
    > npm run build
    > ```

    ```bash
    npm run build
    ```
    > **Note for Windows**: If you encounter permission errors or "UNKNOWN: open" errors, please run the terminal as **Administrator**.
    >
    > **Note on Cross-Platform**: `npm run build` typically builds for the **current operating system**. To get Linux/macOS installers, you should run the build command on those systems or use CI/CD (like GitHub Actions).

    -   **Windows**: Output `.exe` (NSIS) to `release/<version>/`
    -   **Linux**: Output `.AppImage`, `.deb` to `release/<version>/`
    -   **macOS**: Output `.dmg` to `release/<version>/`

### Distribution (Sharing)
-   **Windows**: Share the `.exe` installer (e.g., `PersonalAIToolsPage Setup 0.0.1.exe`).
-   **macOS**: Share the `.dmg` file.
-   **Linux**: Share the `.AppImage` file (Portable) or `.deb` file (Installer).

### Installation & Uninstallation
1.  **Windows**
    -   **Install**: Run the generated `.exe` file to install.
    -   **Uninstall**: Go to **Settings > Apps > Installed apps**, find **PersonalAIToolsPage**, and click **Uninstall**. Alternatively, run the `Uninstall PersonalAIToolsPage.exe` located in the installation directory (usually `%LOCALAPPDATA%\Programs\PersonalAIToolsPage`).
2.  **macOS**
    -   **Install**: Open the `.dmg` file and drag the icon to the **Applications** folder.
    -   **Uninstall**: Move the application from the **Applications** folder to the Trash.
3.  **Linux**
    -   **AppImage**: No installation required. Simply delete the `.AppImage` file to uninstall.
    -   **Deb**: Install via `sudo dpkg -i <file>.deb`. Uninstall via `sudo apt remove personal-ai-page` (or use your system's package manager).

### Key Features
1.  **Multi-AI Support**: Simultaneous access to ChatGPT, Gemini, Claude, DeepSeek, and more.
2.  **Unified Input**: Send prompts and files to all active AIs at once.
3.  **Customizable Workspace**: Add custom AI services via URL and CSS selectors.
4.  **Resizable Split View**: Adjust window sizes using `react-split`.
5.  **Image/File Support**: Send images to AIs that support clipboard pasting.
6.  **Login Protection**: Specialized handling to bypass "browser not secure" errors.

### Privacy & Security
1.  **Account Isolation (Sandboxing)**: Each AI service runs in an independent `webview` (sandbox). This ensures strict data isolation (Same-Origin Policy), meaning ChatGPT cannot access Gemini's data, and vice versa.
2.  **Local Data Persistence**: All login states (Cookies, Local Storage) are stored **locally on your device** only. This application functions as a specialized browser and does not upload your account credentials to any intermediate server. You communicate directly with the official AI service providers via HTTPS.
3.  **Security Configuration**:
    -   **Node.js Integration Disabled**: Web pages cannot access your file system or system commands.
    -   **Context Isolation Enabled**: Ensures a secure boundary between the web content and the application's core logic.

### Technical Implementation

#### 1. Architecture
-   **Frontend**: React (TypeScript) + Vite
-   **Backend/Shell**: Electron (Main Process)
-   **Embedding**: Electron `<webview>` tag (enabled via `webviewTag: true` in `webPreferences`)

#### 2. Browser Compatibility & Login Optimization
To ensure a seamless login experience with third-party providers (e.g., Google, Apple), the application includes specialized compatibility layers. These adjustments harmonize the Electron environment with standard browser expectations, resolving common "browser security" alerts:
-   **Environment Standardization**: Adjusts User Agent and browser signatures to match standard Firefox/Chrome environments.
-   **Automation Flags Optimization**: Refines internal browser flags to ensure stability.
-   **Header Normalization**: Aligns request headers with standard browser behavior.

#### 3. Cross-Process Communication (IPC)
-   Uses `ipcMain` and `ipcRenderer` (via `contextBridge`) for secure communication.
-   **Clipboard Operations**: The Renderer process cannot directly write images to the system clipboard in a way that all webviews accept. The app uses IPC to invoke `clipboard.writeImage` in the Main process for reliable image pasting.

#### 4. Unified Input & Injection
-   **Text Injection**: Uses `webview.executeJavaScript` to inject text into target web pages.
    -   Handles both standard `<textarea>` and complex `contenteditable` `<div>` elements.
    -   Dispatches a sequence of events (`input`, `change`, `keydown`, `compositionend`) to ensure modern frameworks (React/Vue/Angular) detect the input changes.
-   **Image Injection**:
    1.  Reads selected file as Data URL in Renderer.
    2.  Sends Data URL to Main process via IPC to write to system clipboard.
    3.  Focuses the target webview input.
    4.  Simulates `Ctrl+V` (Paste) keyboard event within the webview.

#### 5. File Handling
-   **Duplicate Detection**: Prevents duplicate file uploads by checking file name and size.
-   **Preview**: Horizontal scrolling list for file previews.

### Known Issues
#### Wenxin Yiyan Integration
Due to complex Shadow DOM structures and React/Vue state synchronization mechanisms in Wenxin's editor, the following compatibility issues persist and cannot be fully resolved at this time. The service has been temporarily hidden in the code:
1.  **Missing Placeholder**: The native placeholder text does not appear when the input box is idle.
2.  **Input View Not Syncing**: Manually deleting text with Backspace does not update the input box view in real-time, resulting in "ghost text" residue, even if the underlying data has changed.
3.  **Image Residue**: Incomplete cleanup after sending images.

---

<a name="chinese"></a>
## 🇨🇳 中文

### 项目概述
这是一个基于 **Electron + Vite + React** 构建的桌面应用程序，将多个 AI Web 服务（ChatGPT、Gemini、通义千问、DeepSeek 等）集成到一个统一的界面中。它允许用户使用单一输入框同时与多个 AI 交互，支持发送文本和图片。

### 核心功能
1.  **多 AI 支持**：同时访问 ChatGPT、Gemini、Claude、DeepSeek 等。
2.  **统一输入**：一次性向所有激活的 AI 发送提示词和文件。
3.  **自定义工作区**：通过 URL 和 CSS 选择器添加自定义 AI 服务。
4.  **可调整分屏**：使用 `react-split` 自由调整窗口大小。
5.  **图片/文件支持**：向支持剪贴板粘贴的 AI 发送图片。
6.  **登录保护**：专门处理“浏览器不安全”错误，确保账号正常登录。

### 隐私与安全
1.  **账户隔离 (沙箱机制)**：每个 AI 服务都在独立的 `webview`（沙箱）中运行。这确保了严格的数据隔离（同源策略），意味着 ChatGPT 无法访问 Gemini 的数据，反之亦然。
2.  **本地数据存储**：所有的登录状态（Cookie、Local Storage）都**仅存储在您的本地设备**上。本应用本质上是一个定制化的浏览器，**不会**将您的账号密码上传到任何中间服务器。您是直接与官方 AI 服务提供商进行加密通信 (HTTPS)。
3.  **安全配置**：
    -   **禁用 Node.js 集成**：网页无法访问您的文件系统或执行系统命令。
    -   **开启上下文隔离**：确保网页内容与应用核心逻辑之间的安全边界。

### 构建与发布
1.  **安装依赖**
    ```bash
    npm install
    ```
2.  **开发模式**
    ```bash
    npm run dev
    ```
3.  **打包构建**
    > **国内用户提示**：如果遇到下载超时问题，请在打包前配置镜像环境变量：
    >
    > **Windows (PowerShell)**:
    > ```powershell
    > $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
    > $env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
    > npm run build
    > ```
    >
    > **macOS / Linux**:
    > ```bash
    > export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
    > export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
    > npm run build
    > ```

    ```bash
    npm run build
    ```
    > **Windows 用户注意**：如果遇到权限错误或 "UNKNOWN: open" 报错，请以**管理员身份**运行终端。
    >
    > **关于跨平台构建**：`npm run build` 通常只构建**当前操作系统**的版本。要获取 Linux/macOS 的安装包，建议在对应的系统上运行构建命令，或使用 CI/CD（如 GitHub Actions）。

    -   **Windows**: 在 `release/<version>/` 生成 `.exe` (NSIS)
    -   **Linux**: 在 `release/<version>/` 生成 `.AppImage`, `.deb`
    -   **macOS**: 在 `release/<version>/` 生成 `.dmg`

### 分发（分享给他人）
-   **Windows**: 分享 `.exe` 安装程序（例如 `PersonalAIToolsPage Setup 0.0.1.exe`）。
-   **macOS**: 分享 `.dmg` 文件。
-   **Linux**: 分享 `.AppImage` 文件（免安装便携版）或 `.deb` 文件（安装包）。

### 安装与卸载
1.  **Windows**
    -   **安装**：运行生成的 `.exe` 文件即可安装。
    -   **卸载**：进入 **设置 > 应用 > 安装的应用**，找到 **PersonalAIToolsPage**，点击 **卸载**。或者在安装目录（通常是 `%LOCALAPPDATA%\Programs\PersonalAIToolsPage`）下运行 `Uninstall PersonalAIToolsPage.exe`。
2.  **macOS**
    -   **安装**：打开 `.dmg` 文件并将图标拖入 **应用程序** 文件夹。
    -   **卸载**：将应用程序从 **应用程序** 文件夹移至废纸篓即可。
3.  **Linux**
    -   **AppImage**：无需安装，直接运行。卸载时直接删除 `.AppImage` 文件。
    -   **Deb**：通过 `sudo dpkg -i <file>.deb` 安装。卸载时使用 `sudo apt remove personal-ai-page`（或使用系统的包管理器）。

### 关键技术实现

#### 1. 架构
-   **前端**：React (TypeScript) + Vite
-   **后端/壳**：Electron (主进程)
-   **嵌入方式**：Electron `<webview>` 标签 (通过 `webPreferences` 中的 `webviewTag: true` 启用)

#### 2. 浏览器兼容性与登录优化
为了确保第三方账号（如 Google、Apple）的顺畅登录，本应用内置了专门的兼容性适配层。通过调整运行环境参数，使其符合现代浏览器的安全验证标准，从而有效解决了常见的“浏览器不兼容”或“环境异常”提示：
-   **环境标准化**：调整 User Agent 和浏览器签名，使其与标准的 Firefox/Chrome 环境保持一致。
-   **自动化标志优化**：微调内部浏览器标志以确保稳定性。
-   **请求头规范化**：使网络请求头与标准浏览器行为保持一致。

#### 3. 跨进程通信 (IPC)
-   使用 `ipcMain` 和 `ipcRenderer` (通过 `contextBridge`) 进行安全通信。
-   **剪贴板操作**：渲染进程无法直接以所有 webview 都能接受的方式将图片写入系统剪贴板。应用使用 IPC 调用主进程中的 `clipboard.writeImage` 来实现可靠的图片粘贴。

#### 4. 统一输入与注入
-   **文本注入**：使用 `webview.executeJavaScript` 将文本注入目标网页。
    -   兼容标准 `<textarea>` 和复杂的 `contenteditable` `<div>` 元素。
    -   触发一系列事件 (`input`, `change`, `keydown`, `compositionend`) 以确保现代前端框架 (React/Vue/Angular) 能检测到输入变化。
-   **图片注入**：
    1.  在渲染进程读取选中的文件为 Data URL。
    2.  通过 IPC 发送 Data URL 到主进程，写入系统剪贴板。
    3.  聚焦目标 webview 输入框。
    4.  在 webview 内部模拟 `Ctrl+V` (粘贴) 键盘事件。

#### 5. 文件处理
-   **重复检测**：通过检查文件名和大小防止重复上传文件。
-   **预览**：文件预览列表支持横向滚动。

### 待解决问题 (Known Issues)
#### 文心一言 (Wenxin Yiyan) 集成问题
由于文心一言编辑器底层复杂的 Shadow DOM 结构及 React/Vue 状态同步机制，目前存在以下兼容性问题，暂时无法完美修复，已在代码中暂时隐藏该服务：
1.  **Placeholder 丢失**：输入框空闲时无法显示原生的提示文案（“自动适配需求...”）。
2.  **手动输入视图不同步**：手动输入文字后使用 Backspace 删除，输入框视图不会实时更新，导致出现文字残留（Ghost Text），虽然底层数据可能已改变，但用户视觉上会看到残留文字。
3.  **图片发送残留**：图片发送后可能存在清理不彻底的情况。

### 项目结构
```
├── electron/                 # Electron 主进程代码
│   ├── main.ts               # 入口文件，窗口管理，IPC 处理
│   └── preload.ts            # 预加载脚本，安全通信桥梁
├── src/                      # React 渲染进程代码
│   ├── assets/               # 静态资源
│   ├── App.css               # 全局样式
│   ├── App.tsx               # 主应用组件 (UI 与 逻辑)
│   ├── constants.ts          # AI 服务配置 (URL, 选择器)
│   ├── locales.ts            # 国际化文本资源
│   ├── main.tsx              # React 入口文件
│   └── index.css             # 基础样式
├── dist/                     # 构建输出 (渲染进程)
├── dist-electron/            # 构建输出 (主进程)
├── release/                  # 打包输出 (安装包)
├── package.json              # 依赖与脚本配置
└── README.md                 # 项目说明文档
```
