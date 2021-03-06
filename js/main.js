const {app, BrowserWindow, Menu} = require('electron');

const path = require('path');
const url = require('url');
const os = require('os');

let windows = [];

const staticDir = path.normalize(path.join(__dirname, '..', '..', '..', 'static'));
const assetsDir = path.join(staticDir, 'assets');

function createWindow () {
    let window = new BrowserWindow({
        titleBarStyle: 'hiddenInset',
        icon: path.join(assetsDir, 'images', 'icon.png'),
        width: 500,
        height: 200,
        backgroundColor: '#F5F5F5',
        autoHideMenuBar: true,
        resizable: false,
        fullscreenable: false,
        webPreferences: {
            nodeIntegration: true
        }
    });
    windows.push(window);

    // Uncomment to open devtools when player window shows
    //window.webContents.openDevTools();

    window.loadURL(url.format({
        pathname: path.join(staticDir, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Emitted when the window is closed.
    window.on('closed', function () {
        var index = windows.indexOf(window);
        windows.splice(index, 1);
    });

    // Sync the app menu for macOS
    window.on('focus', function() {
        window.webContents.send('sync_menu');
    });
}

function appReady() {
    const menuTemplate = [
        {
            label: 'SMP',
            submenu: [
                {
                    label: 'About SMP',
                    click: () => {
                        var options = {
                            icon: path.join(assetsDir, 'images', 'icon.png'),
                            width: 440,
                            height: 170,
                            title: 'About SMP',
                            parent: BrowserWindow.getFocusedWindow(),
                            modal: true,
                            webPreferences: {
                                nodeIntegration: true
                            }
                        };

                        // Give a little more height on macOS for the "close" button
                        if (os.type() === 'Darwin') {
                            options.height = 200;
                        }

                        let aboutWindow = new BrowserWindow(options);
                        aboutWindow.setMenu(null);
                        aboutWindow.loadURL(url.format({
                            pathname: path.join(staticDir, 'about.html'),
                            protocol: 'file:',
                            slashes: true
                        }));
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit',
                    accelerator: 'CommandOrControl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Single File',
                    accelerator: 'CommandOrControl+O',
                    click: () => {
                        let focused = BrowserWindow.getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('open_single_file');
                        }
                    }
                },
                {
                    label: 'Open Directory',
                    accelerator: 'CommandOrControl+Shift+O',
                    click: () => {
                        let focused = BrowserWindow.getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('open_directory');
                        }
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'New Window',
                    accelerator: 'CommandOrControl+N',
                    click: () => {
                        createWindow();
                    }
                },
                {
                    label: 'Close Window',
                    accelerator: 'CommandOrControl+W',
                    click: () => {
                        let focused = BrowserWindow.getFocusedWindow();
                        if (focused) {
                            focused.close();
                        }
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Playback',
            submenu: [
                {
                    label: 'Shuffle',
                    id: 'toggleShuffle',
                    type: 'checkbox',
                    checked: false,
                    click: () => {
                        let focused = BrowserWindow.getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('toggleShuffle');
                        }
                    }
                },
                {
                    label: 'Prompt for deletion',
                    id: 'togglePrompt',
                    type: 'checkbox',
                    checked: true,
                    click: () => {
                        let focused = BrowserWindow.getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('togglePrompt');
                        }
                    }
                },
                {
                    label: 'Permanently delete',
                    id: 'toggleDelete',
                    type: 'checkbox',
                    checked: false,
                    click: () => {
                        let focused = BrowserWindow.getFocusedWindow();
                        if (focused) {
                            focused.webContents.send('togglePerm');
                        }
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    try {
        createWindow();
    } catch (e) {
        console.error(e);
        throw e;
    }
}

if (!require('electron-squirrel-startup')) {
    app.on('ready', appReady);

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', function () {
        if (windows.length === 0) {
            createWindow();
        }
    });
}
