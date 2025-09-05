#!/bin/bash

echo "🚀 Starting Project Management Platform with Docker..."

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and try again."
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

echo "✅ Docker and docker-compose are available"

# Stop existing containers if running
echo "🛑 Stopping any existing containers..."
docker-compose down

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker-compose ps

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec postgres pg_isready -U postgres -d project_management > /dev/null 2>&1; do
    echo "   Database is starting up..."
    sleep 3
done

echo "✅ Database is ready!"

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec backend npm run migrate

echo ""
echo "🎉 Project Management Platform is now running!"
echo ""
echo "📍 Access URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   pgAdmin:   http://localhost:5050"
echo ""
echo "🗄️  Database Access Information:"
echo "   Host:     localhost"
echo "   Port:     5432"
echo "   Database: project_management"
echo "   Username: postgres"
echo "   Password: postgres123"
echo ""
echo "🔧 pgAdmin Access (Web Interface):"
echo "   URL:      http://localhost:5050"
echo "   Email:    admin@projectmanagement.com"
echo "   Password: admin123"
echo ""
echo "🔍 To view logs:"
echo "   All services: docker-compose logs -f"
echo "   Backend only: docker-compose logs -f backend"
echo "   Frontend only: docker-compose logs -f frontend"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
echo ""