#!/bin/bash

# Video Production Manager - Development Setup Script

echo "🎬 Video Production Manager - Development Setup"
echo "=============================================="

# Check if MongoDB is running
echo "📊 Checking MongoDB connection..."
if ! mongo --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "❌ MongoDB is not running. Please start MongoDB first."
    echo "   - On macOS with Homebrew: brew services start mongodb-community"
    echo "   - On Ubuntu: sudo systemctl start mongod"
    echo "   - On Windows: net start MongoDB"
    exit 1
fi

echo "✅ MongoDB is running"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client
    npm install --legacy-peer-deps
    cd ..
fi

# Seed database if requested
if [ "$1" = "--seed" ]; then
    echo "🌱 Seeding database with sample data..."
    node scripts/seed.js
fi

# Start the application
echo "🚀 Starting Video Production Manager..."
echo "   Backend: http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📧 Demo Credentials:"
echo "   Admin: admin@example.com / admin123"
echo "   User: john@example.com / user123"
echo ""

npm run dev