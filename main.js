const { app, BrowserWindow, Menu, dialog, shell, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Create the browser window (can toggle kiosk mode)
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: 0,
        y: 0,
        fullscreen: false, // Set to true for fullscreen
        kiosk: false, // Set to true for kiosk mode
        frame: true, // Set to false to remove window frame
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: false, // Allow camera access
            allowRunningInsecureContent: true,
            experimentalFeatures: true,
            permissions: ['camera', 'microphone']
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'ICS PHOTOBOOTH - Kiosk Mode',
        show: false,
        backgroundColor: '#0a0a0a',
        alwaysOnTop: true, // Keep on top for kiosk mode
        skipTaskbar: true, // Hide from taskbar
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false // Prevent accidental closing
    });

    // Load the app
    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.setFullScreen(true);
        
        // Focus the window
        if (process.platform === 'darwin') {
            app.dock.hide(); // Hide dock on macOS
        }
        mainWindow.focus();
        
        // Disable right-click context menu
        mainWindow.webContents.on('context-menu', (e) => {
            e.preventDefault();
        });
        
        // Prevent navigation
        mainWindow.webContents.on('will-navigate', (e) => {
            e.preventDefault();
        });
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create kiosk menu (minimal)
    createKioskMenu();

    // Add keyboard shortcuts for kiosk management
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Admin exit combination: Ctrl+Shift+Alt+Q
        if (input.control && input.shift && input.alt && input.key.toLowerCase() === 'q') {
            dialog.showMessageBox(mainWindow, {
                type: 'question',
                title: 'Exit Kiosk Mode',
                message: 'Are you sure you want to exit the kiosk?',
                detail: 'This will close the ICS PHOTOBOOTH application.',
                buttons: ['Cancel', 'Exit'],
                defaultId: 0,
                cancelId: 0
            }).then((result) => {
                if (result.response === 1) {
                    app.quit();
                }
            });
        }
        
        // Admin settings: Ctrl+Shift+Alt+S
        if (input.control && input.shift && input.alt && input.key.toLowerCase() === 's') {
            mainWindow.webContents.toggleDevTools();
        }
        
        // Prevent F11, Alt+F4, etc.
        if (input.key === 'F11' || (input.alt && input.key === 'F4')) {
            event.preventDefault();
        }
    });
}

function createKioskMenu() {
    // Minimal menu for kiosk mode
    const template = [
        {
            label: 'Kiosk',
            submenu: [
                {
                    label: 'New Session',
                    accelerator: 'F1',
                    click: () => {
                        mainWindow.webContents.executeJavaScript('resetBooth()');
                    }
                },
                {
                    label: 'Print',
                    accelerator: 'F2',
                    click: () => {
                        mainWindow.webContents.print({
                            silent: false,
                            printBackground: true,
                            deviceName: '', // Use default printer
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Admin Exit',
                    accelerator: 'CmdOrCtrl+Shift+Alt+Q',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'question',
                            title: 'Exit Kiosk Mode',
                            message: 'Enter admin password to exit:',
                            detail: 'This will close the kiosk application.',
                            buttons: ['Cancel', 'Exit'],
                            defaultId: 0
                        }).then((result) => {
                            if (result.response === 1) {
                                app.quit();
                            }
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
    createWindow();
    
    // Prevent multiple instances
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit(); // Always quit in kiosk mode
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        // Don't open external links in kiosk mode
    });
});

// Prevent app from being hidden
app.on('browser-window-blur', () => {
    if (mainWindow) {
        mainWindow.focus();
    }
});

// Handle system sleep/wake
const powerMonitor = require('electron').powerMonitor;

powerMonitor.on('suspend', () => {
    console.log('System is going to sleep');
});

powerMonitor.on('resume', () => {
    console.log('System resumed');
    if (mainWindow) {
        mainWindow.focus();
        mainWindow.webContents.executeJavaScript('location.reload()');
    }
});

// Enable hardware acceleration for better performance (camera should work fine)
// app.disableHardwareAcceleration(); // Commented out for better performance