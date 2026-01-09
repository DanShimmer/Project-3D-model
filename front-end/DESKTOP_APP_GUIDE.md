# Polyva 3D Desktop App Guide

## Tổng Quan

Polyva 3D có thể chạy như:
- **Web App**: Truy cập qua browser tại `http://localhost:3000`
- **Desktop App**: Cài đặt trực tiếp trên Windows/Mac/Linux

## Cấu Trúc

```
front-end/
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure bridge to renderer
│   ├── installer.nsh    # Windows installer customization
│   └── entitlements.mac.plist  # macOS permissions
├── src/
│   ├── utils/
│   │   └── electron.jsx # React components cho desktop
│   └── styles/
│       └── desktop.css  # Desktop-specific styles
├── package.json         # Web-only dependencies
├── package.electron.json # Full dependencies including Electron
├── build-desktop.ps1    # PowerShell build script
└── build-desktop.bat    # Batch build script
```

## Tính Năng Desktop

### 1. Custom Titlebar
- Titlebar tùy chỉnh với nút minimize/maximize/close
- Hiển thị tên app và version
- Có thể kéo để di chuyển cửa sổ

### 2. System Tray
- App minimize vào system tray thay vì đóng
- Double-click tray icon để mở lại
- Context menu với options

### 3. Auto Update
- Tự động kiểm tra cập nhật khi mở app
- Thông báo khi có version mới
- Download và cài đặt tự động

### 4. Native File Dialogs
- Save/Open dialogs native của OS
- Hỗ trợ drag & drop files

### 5. Keyboard Shortcuts
- `Ctrl+N` - New Project
- `Ctrl+O` - Open Project
- `Ctrl+S` - Save
- `Ctrl+E` - Export Model

### 6. Single Instance
- Chỉ cho phép 1 instance chạy
- Click shortcut khi đã mở sẽ focus vào cửa sổ hiện có

## Phát Triển

### Chạy Development Mode

```bash
cd front-end

# Cài dependencies (lần đầu)
# Sử dụng package.electron.json
copy package.electron.json package.json
npm install

# Chạy dev mode
npm run dev:electron
```

Hoặc dùng script:
```powershell
.\build-desktop.ps1 dev
```

### Build Production

```powershell
# Build cho Windows
.\build-desktop.ps1 build-win

# Build cho tất cả platforms
.\build-desktop.ps1 build

# Tạo unpacked app để test
.\build-desktop.ps1 pack
```

Output sẽ ở thư mục `release/`:
- `Polyva 3D-1.0.0-x64-Setup.exe` - Windows installer
- `Polyva 3D-1.0.0-x64.exe` - Portable version
- `Polyva 3D-1.0.0-x64.dmg` - macOS
- `Polyva 3D-1.0.0-x64.AppImage` - Linux

## Auto Update Setup

### GitHub Releases
1. Tạo GitHub repository
2. Cấu hình trong `package.electron.json`:
```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "polyva-3d"
}
```
3. Khi build, upload files vào GitHub Releases
4. App sẽ tự động kiểm tra và download updates

### Self-hosted Server
```json
"publish": {
  "provider": "generic",
  "url": "https://your-server.com/updates/"
}
```

Upload các file sau lên server:
- `latest.yml` (auto-generated)
- `.exe` installer files

## Code Sharing Web ↔ Desktop

### Detect Platform
```jsx
import { isElectron, useElectron } from './utils/electron';

function MyComponent() {
  const { isElectronApp, appInfo } = useElectron();
  
  if (isElectronApp) {
    // Desktop-specific code
    return <DesktopVersion />;
  }
  
  // Web version
  return <WebVersion />;
}
```

### Use Native Dialogs
```jsx
import { saveFileDialog, openFileDialog } from './utils/electron';

async function handleSave() {
  const result = await saveFileDialog({
    title: 'Save Model',
    defaultPath: 'my-model.glb',
    filters: [
      { name: '3D Models', extensions: ['glb', 'obj'] }
    ]
  });
  
  if (!result.canceled) {
    // Save to result.filePath
  }
}
```

### Handle Menu Actions
```jsx
import { useMenuAction } from './utils/electron';

function App() {
  useMenuAction((action) => {
    switch (action) {
      case 'new-project':
        // Handle new project
        break;
      case 'save':
        // Handle save
        break;
      case 'export':
        // Handle export
        break;
    }
  });
  
  return <YourApp />;
}
```

## Responsive UI

### Window Size Breakpoints
```css
/* Small window (< 1200px) */
@media (max-width: 1200px) {
  .sidebar { width: 200px; }
}

/* Medium window (1201-1600px) */
@media (min-width: 1201px) and (max-width: 1600px) {
  .sidebar { width: 240px; }
}

/* Large window (> 1600px) */
@media (min-width: 1601px) {
  .sidebar { width: 280px; }
}
```

### Window State Handling
```jsx
const { windowState } = useElectron();

// windowState: 'normal' | 'maximized' | 'fullscreen'
```

## Troubleshooting

### Build Errors

**Error: electron-builder not found**
```bash
npm install electron-builder --save-dev
```

**Error: Cannot find module 'electron'**
```bash
# Đảm bảo dùng đúng package.json
copy package.electron.json package.json
npm install
```

### Runtime Errors

**White screen on startup**
- Check console (View > Toggle Developer Tools)
- Verify Vite build completed successfully
- Check paths in `main.js`

**Auto-update not working**
- Verify GitHub token có quyền release
- Check `latest.yml` exists on release
- Test với `npm run pack` trước

### Performance

**Slow startup**
- Enable asar packaging
- Pre-compile native modules
- Lazy load heavy components

**High memory usage**
- Dispose Three.js objects properly
- Limit model cache size
- Monitor with Task Manager

## Security Best Practices

1. **Context Isolation**: Enabled by default
2. **Node Integration**: Disabled in renderer
3. **Preload Scripts**: Use for secure IPC
4. **CSP Headers**: Configure in index.html
5. **External Links**: Open in system browser

## Publishing

### Windows Code Signing
```bash
# Set environment variables
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your-password

npm run build:win
```

### macOS Notarization
```bash
export APPLE_ID=your-apple-id
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=your-team-id

npm run build:mac
```

## Support

- GitHub Issues: https://github.com/polyva/polyva-3d/issues
- Documentation: https://polyva.io/docs
- Discord: https://discord.gg/polyva
