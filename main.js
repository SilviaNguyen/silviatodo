// main.js

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

// Biến toàn cục để giữ tham chiếu đến cửa sổ chính
let mainWindow;

// --- BẮT ĐẦU: Logic đảm bảo chỉ một phiên bản ứng dụng được chạy ---

// Yêu cầu một khóa (lock) để đảm bảo chỉ một instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Nếu không nhận được khóa, nghĩa là đã có một instance khác đang chạy -> thoát instance này.
    app.quit();
} else {
    // Nếu nhận được khóa, đây là instance đầu tiên.
    // Lắng nghe sự kiện khi một instance thứ hai được khởi chạy.
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Ai đó đã cố gắng chạy một instance thứ hai, chúng ta nên focus vào cửa sổ của mình.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Tạo cửa sổ chính khi ứng dụng đã sẵn sàng (chỉ cho instance đầu tiên).
    app.whenReady().then(() => {
        createWindow();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
}

// --- KẾT THÚC: Logic đảm bảo chỉ một phiên bản ứng dụng được chạy ---


function createWindow() {
    const savedBounds = store.get('windowBounds', { width: 1380, height: 980 });
    const isMaximized = store.get('isMaximized', false);

    mainWindow = new BrowserWindow({ // Gán vào biến toàn cục
        ...savedBounds,
        minWidth: 800,
        minHeight: 600,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'build/icon.ico'),
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        if (isMaximized) {
            mainWindow.maximize();
        } else {
            mainWindow.show();
        }
    });

    Menu.setApplicationMenu(null);

    // Lưu trạng thái cửa sổ
    mainWindow.on('close', () => {
        try {
            if (!mainWindow.isMaximized()) {
                const bounds = mainWindow.getBounds();
                store.set('windowBounds', bounds);
            }
            store.set('isMaximized', mainWindow.isMaximized());
        } catch (error) {
            console.error('Failed to save window state:', error);
        }
    });

    // Đảm bảo biến mainWindow được giải phóng khi cửa sổ đóng
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}


// Các hàm điều khiển cửa sổ
ipcMain.on('minimize-app', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-app', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-app', () => {
    if (mainWindow) mainWindow.close();
});


app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
