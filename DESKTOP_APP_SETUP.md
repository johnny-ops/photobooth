# Desktop App Setup Guide

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the desktop app:**
   ```bash
   npm start
   ```

## Building for Distribution

### Windows
```bash
npm run build-win
```
Creates installer in `dist/` folder.

### macOS
```bash
npm run build-mac
```
Creates DMG and ZIP files in `dist/` folder.

### Linux
```bash
npm run build-linux
```
Creates AppImage and DEB packages in `dist/` folder.

### All Platforms
```bash
npm run build
```

## Features Fixed

✅ **Camera works correctly** - No inversion, normal camera view
✅ **Alt-Tab enabled** - Can switch between windows normally
✅ **Window controls** - Can minimize, maximize, resize, and close
✅ **Proper file paths** - All assets load correctly
✅ **Camera permissions** - Properly configured for Electron

## Troubleshooting

### Camera not working?
- Make sure camera permissions are granted in system settings
- Check that no other app is using the camera
- Try restarting the app

### Build errors?
- Make sure all dependencies are installed: `npm install`
- Check that Electron and electron-builder are in devDependencies
- Try deleting `node_modules` and reinstalling: `rm -rf node_modules && npm install`

## Development vs Production

- **Development:** `npm start` - Opens Electron window for testing
- **Production:** `npm run build` - Creates distributable packages


