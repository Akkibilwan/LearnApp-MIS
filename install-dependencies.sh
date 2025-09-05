#!/bin/bash

echo "📦 Installing dependencies for Project Management Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js is not installed locally (not required for Docker setup)"
else
    echo "✅ Node.js $(node -v) detected"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
if [ -d "backend" ]; then
    cd backend
    if [ -f "package.json" ]; then
        npm install
        echo "✅ Backend dependencies installed"
    else
        echo "❌ Backend package.json not found"
        exit 1
    fi
    cd ..
else
    echo "❌ Backend directory not found"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
if [ -d "frontend" ]; then
    cd frontend
    if [ -f "package.json" ]; then
        npm install
        echo "✅ Frontend dependencies installed"
    else
        echo "❌ Frontend package.json not found"
        exit 1
    fi
    cd ..
else
    echo "❌ Frontend directory not found"
    exit 1
fi

echo ""
echo "🎉 All dependencies installed successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Start Docker containers: ./start-docker.sh"
echo "2. Or run in development mode:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo ""