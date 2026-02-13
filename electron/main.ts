import { app, BrowserWindow, Menu, ipcMain, clipboard, nativeImage, dialog, session } from 'electron'
import path from 'path'

// [wlishii] 浏览器兼容性与登录优化
// 禁用 AutomationControlled 特性，这是防止被 Google 等第三方服务识别为自动化机器人（Bot）的关键。
// 如果不禁用，Google 登录会直接报错 "This browser or app may not be secure"。
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// 忽略证书错误，配合下方的 certificate-error 事件做“按域名白名单”控制
app.commandLine.appendSwitch('ignore-certificate-errors');

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null
let mainWCId: number | null = null
const DOMESTIC_HOSTS = new Set([
  'tongyi.aliyun.com',
  'yiyan.baidu.com',
  'chat.deepseek.com',
  'www.doubao.com'
]);
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

const menuTranslations = {
  en: {
    file: 'File',
    exit: 'Exit',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Fullscreen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    close: 'Close',
    language: 'Language',
    help: 'Help',
    about: 'About',
    chinese: 'Chinese (中文)',
    english: 'English',
    clearData: 'Clear All Data (Logout)',
    clearDataConfirm: 'Are you sure you want to clear all data (cookies, storage)? This will log you out of all services.',
    cleared: 'All data cleared. Application will reload.'
  },
  zh: {
    file: '文件',
    exit: '退出',
    view: '视图',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '重置缩放',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '切换全屏',
    window: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    close: '关闭',
    language: '语言',
    help: '帮助',
    about: '关于',
    chinese: '中文 (Chinese)',
    english: 'English',
    clearData: '清除所有数据 (退出登录)',
    clearDataConfirm: '确定要清除所有数据（Cookie、缓存）吗？这将导致所有服务退出登录。',
    cleared: '所有数据已清除，应用将重新加载。'
  }
};

type Language = 'en' | 'zh';

async function clearAllData(lang: Language) {
  const t = menuTranslations[lang];
  const { response } = await dialog.showMessageBox(win!, {
    type: 'question',
    buttons: ['Cancel', 'OK'],
    defaultId: 0,
    title: t.clearData,
    message: t.clearDataConfirm,
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png')
  });

  if (response === 1) { // OK
    // 1. Clear default session
    await session.defaultSession.clearStorageData();

    // 2. Clear known partitions
    const partitions = [
      'persist:chatgpt', 
      'persist:claude', 
      'persist:gemini', 
      'persist:tongyi', 
      'persist:doubao', 
      'persist:deepseek', 
      'persist:wenxin'
    ];

    for (const partition of partitions) {
      try {
        const ses = session.fromPartition(partition);
        await ses.clearStorageData();
      } catch (err) {
        console.error(`Failed to clear partition ${partition}:`, err);
      }
    }

    // 3. Reload
    dialog.showMessageBox(win!, {
      type: 'info',
      title: t.clearData,
      message: t.cleared,
      buttons: ['OK']
    }).then(() => {
        win?.reload();
    });
  }
}

function createMenu(lang: Language = 'zh') {
  const t = menuTranslations[lang];
  
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: t.file,
      submenu: [
        { 
          label: t.clearData,
          click: () => clearAllData(lang)
        },
        { type: 'separator' },
        { role: 'quit', label: t.exit }
      ]
    },
    {
      label: t.view,
      submenu: [
        { role: 'reload', label: t.reload },
        { role: 'forceReload', label: t.forceReload },
        { role: 'toggleDevTools', label: t.toggleDevTools },
        { type: 'separator' },
        { 
          label: t.resetZoom,
          accelerator: 'CmdOrControl+0',
          click: () => {
            win?.webContents.send('app-reset-zoom');
          }
        },
        { 
          label: t.zoomIn,
          accelerator: 'CmdOrControl+Plus',
          click: () => {
            win?.webContents.send('app-zoom-in');
          }
        },
        { 
          label: t.zoomIn,
          accelerator: 'CmdOrControl+=',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: () => {
            win?.webContents.send('app-zoom-in');
          }
        },
        { 
          label: t.zoomOut,
          accelerator: 'CmdOrControl+-',
          click: () => {
            win?.webContents.send('app-zoom-out');
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t.toggleFullscreen }
      ]
    },
    {
      label: t.language,
      submenu: [
        {
          label: t.chinese,
          type: 'radio',
          checked: lang === 'zh',
          click: () => {
            createMenu('zh');
            win?.webContents.send('language-changed', 'zh');
          }
        },
        {
          label: t.english,
          type: 'radio',
          checked: lang === 'en',
          click: () => {
            createMenu('en');
            win?.webContents.send('language-changed', 'en');
          }
        }
      ]
    },
    {
      label: t.help,
      submenu: [
        { 
          label: t.about,
          click: () => {
            const version = app.getVersion();
            const message = lang === 'zh' 
              ? `PATP (Personal AI Tools Page)\n版本: v${version}\n\n一个聚合多 AI 服务的桌面助手。\n基于 Electron + React 构建。`
              : `PATP (Personal AI Tools Page)\nVersion: v${version}\n\nA desktop assistant integrating multiple AI services.\nBuilt with Electron + React.`;
            
            dialog.showMessageBox(win!, {
              type: 'info',
              title: t.about,
              message: 'PATP',
              detail: message,
              buttons: ['OK'],
              icon: path.join(process.env.VITE_PUBLIC!, 'icon.png')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  createMenu('zh');

  mainWCId = win.webContents.id;
  win.on('closed', () => {
    mainWCId = null;
    win = null;
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

ipcMain.on('exit-fullscreen', () => {
  if (win && win.isFullScreen()) {
    win.setFullScreen(false);
  }
});

ipcMain.on('set-language', (event, lang: Language) => {
  createMenu(lang);
});

// [wlishii] 跨进程通信 (IPC) 剪贴板图片发送
ipcMain.handle('copy-image-to-clipboard', async (event, dataUrl: string) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
    return true;
  } catch (error) {
    console.error('Failed to write image to clipboard:', error);
    return false;
  }
});

ipcMain.handle('copy-text-to-clipboard', async (event, text: string) => {
  try {
    clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to write text to clipboard:', error);
    return false;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    // [wlishii] 浏览器环境标准化
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';
    contents.on('did-start-navigation', (_e, url) => {
      try {
        const host = new URL(url).hostname;
        if (DOMESTIC_HOSTS.has(host)) {
          contents.setUserAgent(userAgent);
        }
      } catch (error) {
        console.error('Failed to parse URL or set User-Agent:', error);
      }
    });

    contents.on('did-start-loading', () => {
      // 注入 JavaScript 隐藏自动化特征
      contents.executeJavaScript(`
        try {
          Object.defineProperties(navigator, {
            webdriver: { get: () => undefined },
          });
        } catch (e) {}
        
        try {
            Object.defineProperties(navigator, {
                userAgentData: { get: () => undefined },
            });
        } catch (e) {}
      `).catch((err) => {
        console.warn('Failed to inject stealth scripts:', err);
      });
    });
  }
});

// [wlishii] IPC 处理程序
ipcMain.handle('update-domestic-hosts', (_event, hosts: string[]) => {
  if (Array.isArray(hosts)) {
    hosts.forEach(host => {
      try {
        const hostname = host.startsWith('http') ? new URL(host).hostname : host;
        DOMESTIC_HOSTS.add(hostname);
      } catch (err) {
        console.error('Invalid host provided to update-domestic-hosts:', host, err);
      }
    });
  }
  return true;
});

function setupSessionInterceptor() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const isLocalRequest = details.url.startsWith('file://') || 
                           details.url.includes('localhost') || 
                           details.url.includes('127.0.0.1') ||
                           details.url.includes('[::1]') ||
                           details.url.startsWith('devtools://') ||
                           details.url.startsWith('data:') ||
                           details.url.startsWith('blob:');
    
    const isMainWindowRequest = mainWCId != null && details.webContentsId === mainWCId;
    if (isLocalRequest || isMainWindowRequest) {
      callback({ requestHeaders: details.requestHeaders });
      return;
    }

    // [wlishii] 仅对国内 AI 域名进行请求头标准化；对国外域名全部放行
    let hostname = '';
    try {
      hostname = new URL(details.url).hostname;
    } catch (err) {
      console.warn('Invalid URL in onBeforeSendHeaders:', details.url, err);
    }

    if (!DOMESTIC_HOSTS.has(hostname)) {
      callback({ requestHeaders: details.requestHeaders });
      return;
    }

    // [wlishii] 请求头标准化 (仅针对 AI 服务)
    details.requestHeaders['User-Agent'] = userAgent;
    
    const headersToRemove = [
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
      'sec-ch-ua-platform-version',
      'sec-ch-ua-full-version-list',
      'sec-ch-ua-arch',
      'sec-ch-ua-bitness',
      'sec-ch-ua-model'
    ];
    
    headersToRemove.forEach(header => {
      delete details.requestHeaders[header];
      delete details.requestHeaders[header.toLowerCase()];
    });

    callback({ requestHeaders: details.requestHeaders });
  });
}

app.whenReady().then(async () => {
  try {
    await session.defaultSession.setProxy({ mode: 'system' });
  } catch (err) {
    console.warn('Failed to set system proxy, continue without explicit proxy:', err);
  }

  createWindow();
  setupSessionInterceptor();
})

app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  try {
    const host = new URL(url).hostname;
    // 国外域名白名单（可按需扩展）
    const FOREIGN_WHITELIST = new Set([
      'claude.ai',
      'anthropic.com',
      'chatgpt.com',
      'openai.com',
      'gemini.google.com',
      'google.com',
      'gstatic.com',
      'googleusercontent.com'
    ]);
    if (FOREIGN_WHITELIST.has(host) && !DOMESTIC_HOSTS.has(host)) {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch (err) {
    console.error('Error handling certificate error:', err);
  }
  callback(false);
})
