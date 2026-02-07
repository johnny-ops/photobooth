@echo off
REM ICS PHOTOBOOTH - Supabase Setup Script

echo ==========================================
echo ICS PHOTOBOOTH - Supabase Setup
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    (
        echo # Supabase Configuration
        echo # Get these from: https://app.supabase.com/project/[YOUR_PROJECT]/settings/api
        echo.
        echo VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
        echo VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
    ) > .env
    echo .env file created
    echo WARNING: Please update .env with your Supabase credentials
) else (
    echo .env file already exists
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Go to https://supabase.com/
echo 2. Create a new project
echo 3. Create a storage bucket named 'photobooth-videos'
echo 4. Copy your credentials to .env file
echo 5. Run: npm start
echo.
echo For detailed instructions, see SUPABASE_SETUP.md
echo.
pause