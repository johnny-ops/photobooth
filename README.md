# ICS PHOTOBOOTH v3.0
## Modern Web-Based Photobooth Experience

A professional photobooth application featuring hand gesture detection, custom template support, continuous video recording, and cloud storage integration. Perfect for events, parties, and commercial use.

![ICS PHOTOBOOTH](https://via.placeholder.com/800x400/0a0a0a/00ff41?text=ICS+PHOTOBOOTH+v3.0)

## 🎮 Latest Features (v3.0)

- **✋ Hand Detection** - Automatically start sessions by placing your hand in front of the camera
- **🎨 Custom Template Selection** - Visual template selector with thumbnail previews
- **📹 Continuous Video Recording** - Records entire session from start to finish
- **☁️ Cloud Storage Integration** - Automatic upload to Supabase with QR code sharing
- **📱 QR Code Downloads** - Easy video sharing via QR code scanning
- **❓ Interactive Tutorial** - Built-in customer guide for easy operation
- **🔄 Manual & Auto Start** - Choose between hand detection or button click
- **📸 3-Photo Sessions** - Professional photo strip format (2.5" × 7")
- **🖨️ Print Support** - Direct printing with copy selection (1-5 copies)
- **🌐 Web & Desktop** - Works in browsers and as Electron desktop app
- **📦 Vercel Ready** - Optimized for cloud deployment

## 🚀 Quick Start

### Option 1: Easy Installation (Windows)
1. Double-click `install.bat` to install dependencies
2. Double-click `run.bat` to start the application

### Option 2: Manual Installation
1. Install [Node.js](https://nodejs.org/) (version 16 or higher)
2. Open terminal/command prompt in the project folder
3. Run: `npm install`
4. Run: `npm start`

## 🎨 Template System

### Custom Image Templates
- **Visual Template Selector** - Browse and select from available templates
- **Thumbnail Preview** - See templates before selecting
- **Multiple Formats** - Supports PNG, JPG, JPEG
- **Auto-Detection** - Automatically scans for templates in:
  - Root folder: `template.png`, `template1.png`, etc.
  - `public/templates/` folder
  - `public/images/` folder
- **Recommended Size** - 707 × 2000 px (vertical strip format)

### Built-in Code Templates (Legacy)
- **Retro Classic** - Green terminal styling
- **Neon Grid** - Hot pink neon borders
- **Arcade Style** - Bright yellow borders
- **Cyber Punk** - Cyan and magenta colors

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
photoboothv3/
├── index.html              # Main application UI
├── styles.css              # Application styling
├── template.png            # Custom template images (root)
├── template1.png           # Additional templates
├── src/                    # JavaScript source files
│   ├── main.js             # Electron main process
│   ├── script.js           # Application logic
│   ├── supabase-config.js  # Cloud storage configuration
│   └── recording-system.js # Video recording system
├── public/                 # Static assets (for Vercel)
│   └── templates/          # Template images folder
├── scripts/                # Setup scripts
│   ├── install.bat         # Windows installer
│   ├── run.bat             # Windows launcher
│   └── setup-supabase.bat # Supabase setup
├── package.json            # Dependencies and scripts
├── vercel.json             # Vercel deployment config
└── README.md               # This file
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

## 🎯 Customer Tutorial - How to Use

### Quick Start Guide

1. **Position Yourself** - Stand in front of the camera and make sure you're well-lit
2. **Start the Session** - You have two options:
   - **Option A (Auto)**: Place your hand in front of the camera (if hand detection is enabled)
   - **Option B (Manual)**: Click the "START PHOTO SESSION" button
3. **Get Ready** - You'll see a countdown (3, 2, 1) before each photo
4. **Take 3 Photos** - The photobooth automatically captures 3 photos
5. **Get Your Photos** - After all photos are taken:
   - 📱 **Scan the QR code** to download your video
   - 🖨️ **Click Print** to print your photo strip (select 1-5 copies)
   - ⬇️ **Click Download** for direct video download

### 💡 Tips for Best Results

- Make sure you're well-lit and centered in the camera frame
- Wait for the countdown before moving
- Smile and have fun! 😊
- Keep your hand steady if using hand detection

## 🛠️ Setup Instructions

### For Administrators

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase** (Optional - for cloud storage)
   - Create a Supabase project
   - Set up storage bucket named `photobooth-videos`
   - Update `src/supabase-config.js` with your credentials
   - See `SUPABASE_QUICK_SETUP.md` for detailed instructions

3. **Add Custom Templates**
   - Place template images in the root folder: `template.png`, `template1.png`, etc.
   - Or create a `public/templates/` folder
   - Supported formats: `.png`, `.jpg`, `.jpeg`
   - Recommended size: 707 × 2000 px (vertical strip format)

4. **Run the Application**
   ```bash
   npm start
   ```
   Or use the batch script:
   ```bash
   scripts/run.bat
   ```

5. **Deploy to Vercel** (Optional)
   - Push to GitHub
   - Connect to Vercel
   - Deploy automatically
   - See `vercel.json` for configuration

## ⚙️ Configuration Options

### Hand Detection
- **Enable/Disable** - Toggle hand detection in settings
- **Auto-Start** - Automatically starts session when hand is detected
- **Manual Override** - Button click always works regardless of setting
- **Visual Feedback** - Shows indicator when hand is detected

### Template Selection
- **Visual Selector** - Click thumbnails to choose template
- **Auto-Load** - First available template loads automatically
- **Live Preview** - See template on preview strip
- **Custom Images** - Add your own template images

### Video Recording
- **Continuous Recording** - Records entire session from start to finish
- **Format Support** - MP4 (preferred) or WebM (fallback)
- **Cloud Upload** - Automatic upload to Supabase (if configured)
- **Local Download** - Direct download option available

## 🔄 Session Reset

The "Take More Photos" button completely resets:
- Photo counter
- Strip canvas
- Video recording
- QR code
- Download links
- All session data
- Hand detection (restarts if enabled)

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
- **Green Tint**: Fixed in v3.0 - clear camera feed

### Hand Detection Issues
- **Not Working**: Make sure hand detection toggle is enabled
- **Too Sensitive**: Hand must be held steady for 1 second
- **Not Detecting**: Ensure good lighting and clear view of hand
- **Library Not Loading**: Check internet connection (MediaPipe loads from CDN)

### Template Issues
- **Not Showing**: Check file paths and formats (PNG/JPG)
- **Wrong Size**: Recommended 707 × 2000 px for vertical strips
- **Not Loading**: Check browser console for errors
- **Selector Empty**: Add templates to root or `public/templates/` folder

### Video Recording Issues
- **0 Seconds**: Fixed in v3.0 - continuous recording works properly
- **Not Downloading**: Check browser download permissions
- **Wrong Format**: MP4 preferred, WebM fallback
- **Cloud Upload Fails**: Verify Supabase configuration

### Installation Issues
- **Node.js Missing**: Install from [nodejs.org](https://nodejs.org/)
- **Permission Errors**: Run as administrator on Windows
- **Port Conflicts**: Close other applications using camera
- **Vercel Deployment**: Check `vercel.json` configuration

### Print Issues
- **Wrong Size**: Check printer settings for actual size (2.5" × 7")
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