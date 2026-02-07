@echo off
echo ========================================
echo Starting ICS PHOTOBOOTH...
echo ========================================
echo.

npm start

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start ICS PHOTOBOOTH!
    echo Make sure you have run install.bat first.
    echo.
    pause
)