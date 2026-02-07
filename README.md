# ICS PHOTOBOOTH
## Retro Pixelated Photo Experience

A desktop photobooth application with a retro pixelated design, featuring professional photo strips, HD video recording, and multiple retro templates.

![ICS PHOTOBOOTH](https://via.placeholder.com/800x400/0a0a0a/00ff41?text=ICS+PHOTOBOOTH)

## 🎮 Features

- **Retro Pixelated UI** - Classic 80s/90s computer aesthetic
- **4 Pixel Templates** - Retro Classic, Neon Grid, Arcade Style, Cyber Punk
- **Professional Photo Strips** - Print-ready 2.5" × 7" format at 300 DPI
- **HD Video Recording** - 1080p video capture with QR code sharing
- **Desktop App** - Runs as a native desktop application
- **Camera Selection** - Choose from multiple camera devices
- **Print Support** - Direct printing with proper formatting
- **Session Reset** - Complete reset functionality for new sessions

## 🚀 Quick Start

### Option 1: Easy Installation (Windows)
1. Double-click `install.bat` to install dependencies
2. Double-click `run.bat` to start the application

### Option 2: Manual Installation
1. Install [Node.js](https://nodejs.org/) (version 16 or higher)
2. Open terminal/command prompt in the project folder
3. Run: `npm install`
4. Run: `npm start`

## 🎨 Retro Templates

### 1. Retro Classic
- Classic green terminal styling
- Yellow accent colors
- Pixel corner decorations
- "REC" indicator

### 2. Neon Grid
- Hot pink neon borders
- Cyan grid overlay
- Glowing corner elements
- Cyberpunk aesthetic

### 3. Arcade Style
- Bright yellow borders
- Orange accent elements
- Pixel strip decorations
- Score display styling

### 4. Cyber Punk
- Cyan and magenta colors
- Circuit line patterns
- Cyber nodes
- Futuristic styling

## 🖨️ Print Specifications

- **Size**: 2.5" × 7" (Half 5R format)
- **Resolution**: 300 DPI
- **Format**: PNG for photos, WEBM for video
- **Layout**: Professional photo strip with branding

## ⌨️ Keyboard Shortcuts

- `Ctrl+N` - New Session
- `Ctrl+P` - Print
- `Ctrl+R` - Reload
- `F11` - Toggle Fullscreen
- `Esc` - Exit Fullscreen
- `Ctrl+Q` - Quit Application

## 🔧 Technical Requirements

- **Operating System**: Windows 10/11, macOS 10.14+, or Linux
- **Node.js**: Version 16 or higher
- **Camera**: USB webcam or built-in camera
- **Memory**: 4GB RAM minimum
- **Storage**: 500MB free space

## 📁 Project Structure

```
ics-photobooth/
├── main.js              # Electron main process
├── index.html           # Main application UI
├── styles.css           # Retro pixelated styling
├── script.js            # Application logic
├── package.json         # Dependencies and scripts
├── install.bat          # Windows installer
├── run.bat             # Windows launcher
└── README.md           # This file
```

## 🛠️ Development

### Building Executable
```bash
npm run build
```

### Development Mode
```bash
npm start
```

### Debugging
Press `Ctrl+Shift+I` to open Developer Tools

## 🎯 Usage Instructions

1. **Start Application** - Launch using `run.bat` or `npm start`
2. **Select Camera** - Choose your camera device from dropdown
3. **Pick Template** - Select your preferred retro style
4. **Set Photo Count** - Choose 2, 3, or 4 photos
5. **Start Session** - Click "START SESSION" button
6. **Take Photos** - Follow the countdown for each shot
7. **Print & Share** - Print your strip and scan QR for video

## 🔄 Session Reset

The "NEW SESSION" button completely resets:
- Photo counter
- Strip canvas
- Video recording
- QR code
- Download links
- All session data

## 🎨 Customization

### Adding New Templates
1. Add template definition to `TEMPLATES` object in `script.js`
2. Create corresponding draw function
3. Add option to HTML select element
4. Update CSS if needed for new colors

### Modifying Print Layout
- Adjust `CONFIG.PRINT_W` and `CONFIG.PRINT_H` for different sizes
- Modify `initStrip()` and `addToStrip()` functions for layout changes

## 🐛 Troubleshooting

### Camera Issues
- **Black Screen**: Try different camera in dropdown
- **Access Denied**: Allow camera permissions in browser
- **Not Found**: Check camera connections and drivers

### Installation Issues
- **Node.js Missing**: Install from [nodejs.org](https://nodejs.org/)
- **Permission Errors**: Run as administrator on Windows
- **Port Conflicts**: Close other applications using camera

### Print Issues
- **Wrong Size**: Check printer settings for actual size
- **Poor Quality**: Ensure 300 DPI setting in printer preferences
- **Colors Off**: Calibrate monitor and printer color profiles

## 📄 License

MIT License - Feel free to modify and distribute

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

**ICS PHOTOBOOTH** - Bringing retro computing aesthetics to modern photo experiences! 🎮📸