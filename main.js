// main.js

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Khởi tạo store ở phạm vi toàn cục để lưu trạng thái cửa sổ
const store = new Store();

function createWindow() {
    // Lấy trạng thái cửa sổ đã lưu, nếu không có thì dùng giá trị mặc định
    const savedBounds = store.get('windowBounds', { width: 1380, height: 980 });
    const isMaximized = store.get('isMaximized', false);

    const mainWindow = new BrowserWindow({
        ...savedBounds, // Áp dụng kích thước và vị trí đã lưu
        minWidth: 800,
        minHeight: 600,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'build/icon.ico'),
        show: false // Bắt đầu ở trạng thái ẩn để tránh hiện tượng giật màn hình
    });

    mainWindow.loadFile('index.html');

    // Chỉ hiển thị cửa sổ khi nội dung đã sẵn sàng để tải
    mainWindow.once('ready-to-show', () => {
        if (isMaximized) {
            mainWindow.maximize();
        } else {
            mainWindow.show();
        }
    });

    Menu.setApplicationMenu(null);

    // Lưu trạng thái cửa sổ trước khi đóng ứng dụng
    mainWindow.on('close', () => {
        const bounds = mainWindow.getBounds();
        store.set('windowBounds', bounds);
        store.set('isMaximized', mainWindow.isMaximized());
    });

    // Các hàm điều khiển cửa sổ
    ipcMain.on('minimize-app', () => {
        mainWindow.minimize();
    });

    ipcMain.on('maximize-app', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('close-app', () => {
        mainWindow.close();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
