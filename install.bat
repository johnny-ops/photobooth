@echo off
echo ========================================
echo ICS PHOTOBOOTH - Desktop App Installer
echo ========================================
echo.

echo Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo Then run this installer again.
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To run ICS PHOTOBOOTH:
echo   npm start
echo.
echo To build executable:
echo   npm run build
echo.
pause