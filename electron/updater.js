// electron/updater.js
// Auto-update via GitHub Releases. Checks on launch, then every 6 hours.
// When an update is found, downloads in the background and prompts the user
// to restart-and-install via a native dialog.

const { app, dialog, autoUpdater: nativeAutoUpdater, BrowserWindow } = require('electron');

let autoUpdater;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (err) {
  console.warn('[updater] electron-updater not installed — auto-update disabled');
  autoUpdater = null;
}

// Skip in dev mode (no point checking for updates when running unpackaged)
const SKIP = !app.isPackaged;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let downloadingNotified = false;
let updateAvailable = false;

function init() {
  if (SKIP || !autoUpdater) {
    console.log('[updater] skipping (dev mode or module missing)');
    return;
  }

  autoUpdater.autoDownload = true;          // download in background
  autoUpdater.autoInstallOnAppQuit = true;  // install if user quits before responding

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for update…');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available:', info.version);
    updateAvailable = true;
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] no update available');
  });

  autoUpdater.on('download-progress', (p) => {
    if (!downloadingNotified) {
      console.log(`[updater] downloading update… ${Math.round(p.percent)}%`);
      downloadingNotified = true;
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message || err);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('[updater] update downloaded:', info.version);
    const focused = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(focused, {
      type: 'info',
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: `Zekthar ${info.version} is ready to install.`,
      detail: 'The app will restart to apply the update.',
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  // Kick off first check shortly after launch (gives the app time to settle)
  setTimeout(() => check().catch(() => {}), 10_000);

  // Recurring check
  setInterval(() => check().catch(() => {}), CHECK_INTERVAL_MS);
}

async function check() {
  if (SKIP || !autoUpdater) return;
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('[updater] check failed:', err?.message || err);
  }
}

function isUpdateAvailable() {
  return updateAvailable;
}

module.exports = { init, check, isUpdateAvailable };
