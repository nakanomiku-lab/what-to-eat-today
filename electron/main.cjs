const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const geocodeCache = new Map();
let lastGeocodeAt = 0;

const WINDOWS_LOCATION_SCRIPT = `
$ErrorActionPreference = 'Stop'
$watcher = $null

try {
  Add-Type -AssemblyName System.Device
  $watcher = New-Object System.Device.Location.GeoCoordinateWatcher
  $started = $watcher.TryStart($false, [TimeSpan]::FromSeconds(10))

  if (-not $started) {
    @{ ok = $false; code = 'START_FAILED'; message = 'Windows 定位服务未能启动。' } |
      ConvertTo-Json -Compress |
      Write-Output
    exit 0
  }

  $location = $watcher.Position.Location
  if ($location -and -not $location.IsUnknown) {
    @{
      ok = $true
      source = 'windows-native'
      coords = @{
        lat = [double]$location.Latitude
        lng = [double]$location.Longitude
        accuracy = [double]$location.HorizontalAccuracy
      }
    } |
      ConvertTo-Json -Compress |
      Write-Output
  } else {
    @{ ok = $false; code = 'LOCATION_UNKNOWN'; message = 'Windows 未返回可用的位置数据。' } |
      ConvertTo-Json -Compress |
      Write-Output
  }
} catch {
  @{ ok = $false; code = 'ERROR'; message = $_.Exception.Message } |
    ConvertTo-Json -Compress |
    Write-Output
} finally {
  if ($watcher) {
    $watcher.Stop()
  }
}
`;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: '#fff7ed',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  mainWindow.loadFile(path.join(rootDir, 'dist', 'index.html'));
}

function getWindowsCurrentLocation() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-Command', WINDOWS_LOCATION_SCRIPT],
      {
        windowsHide: true,
        timeout: 15000,
      },
      (error, stdout, stderr) => {
        const rawOutput = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .pop();

        if (!rawOutput) {
          resolve({
            ok: false,
            code: 'NO_OUTPUT',
            message:
              stderr.trim() || error?.message || 'Windows 原生定位接口没有返回可用结果。',
          });
          return;
        }

        try {
          resolve(JSON.parse(rawOutput));
        } catch {
          resolve({
            ok: false,
            code: 'PARSE_ERROR',
            message: `无法解析 Windows 定位结果：${rawOutput}`,
          });
        }
      }
    );
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function geocodeAddress(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      ok: false,
      code: 'EMPTY_QUERY',
      message: '请输入一个完整一些的地址或地名。',
      results: [],
    };
  }

  const cached = geocodeCache.get(normalizedQuery);
  if (cached) {
    return cached;
  }

  const now = Date.now();
  const elapsed = now - lastGeocodeAt;
  if (elapsed < 1100) {
    await wait(1100 - elapsed);
  }
  lastGeocodeAt = Date.now();

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    dedupe: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
      'User-Agent': 'what-to-eat-today-electron/1.0 (manual address search)',
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      code: 'HTTP_ERROR',
      message: `地址搜索服务暂时不可用（HTTP ${response.status}）。`,
      results: [],
    };
  }

  const payload = await response.json();
  const results = Array.isArray(payload)
    ? payload
        .map((item) => ({
          id: `${item.place_id ?? item.osm_id ?? item.display_name}`,
          displayName: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
          type: item.type || item.addresstype || item.category || '地点',
          licence: item.licence || '',
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
    : [];

  const result = {
    ok: true,
    source: 'nominatim',
    query: normalizedQuery,
    results,
  };

  geocodeCache.set(normalizedQuery, result);
  return result;
}

ipcMain.handle('desktop-location:get-current', async () => {
  if (process.platform !== 'win32') {
    return {
      ok: false,
      code: 'UNSUPPORTED',
      message: '当前原生定位实现只接入了 Windows。',
    };
  }

  return getWindowsCurrentLocation();
});

ipcMain.handle('desktop-location:geocode-address', async (_event, query) => {
  try {
    return await geocodeAddress(String(query || ''));
  } catch (error) {
    return {
      ok: false,
      code: 'REQUEST_FAILED',
      message: error instanceof Error ? error.message : '地址搜索请求失败。',
      results: [],
    };
  }
});

ipcMain.handle('desktop-location:open-settings', async () => {
  if (process.platform !== 'win32') {
    return false;
  }

  await shell.openExternal('ms-settings:privacy-location');
  return true;
});

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.matchprogram.whattoeat');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
