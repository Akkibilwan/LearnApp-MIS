#!/bin/bash

echo "🚀 Setting up Project Management Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -c2- | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not detected. Please make sure PostgreSQL 14+ is installed and running."
fi

echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f "package.json" ]; then
    echo "❌ Backend package.json not found"
    exit 1
fi
npm install

echo "📦 Installing frontend dependencies..."
cd ../frontend
if [ ! -f "package.json" ]; then
    echo "❌ Frontend package.json not found"
    exit 1
fi
npm install

cd ..

echo "📄 Setting up environment files..."

# Create backend .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your database credentials"
fi

echo "🗄️  Database setup instructions:"
echo ""
echo "1. Create a PostgreSQL database:"
echo "   createdb project_management"
echo ""
echo "2. Update backend/.env with your database credentials"
echo ""
echo "3. Run database migrations:"
echo "   cd backend && npm run migrate"
echo ""
echo "4. Start the development servers:"
echo "   npm run dev"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "✅ Setup complete! Please follow the database setup instructions above."