#!/bin/bash

# ICS PHOTOBOOTH - Supabase Setup Script

echo "=========================================="
echo "ICS PHOTOBOOTH - Supabase Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies!"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Supabase Configuration
# Get these from: https://app.supabase.com/project/[YOUR_PROJECT]/settings/api

VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
EOF
    echo "✅ .env file created"
    echo "⚠️  Please update .env with your Supabase credentials"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to https://supabase.com/"
echo "2. Create a new project"
echo "3. Create a storage bucket named 'photobooth-videos'"
echo "4. Copy your credentials to .env file"
echo "5. Run: npm start"
echo ""
echo "For detailed instructions, see SUPABASE_SETUP.md"
echo ""