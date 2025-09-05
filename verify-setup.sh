#!/bin/bash

echo "🔍 Verifying Project Management Platform Setup..."

# Function to check if a service is responding
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo "Checking $name at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
            echo "✅ $name is responding"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ $name is not responding after $max_attempts attempts"
    return 1
}

# Check if Docker containers are running
echo "📦 Checking Docker containers..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Docker containers are not running. Please run './start-docker.sh' first."
    exit 1
fi

echo "✅ Docker containers are running"

# Check services
echo ""
echo "🔍 Verifying services..."

# Check backend health
if check_service "http://localhost:3001/health" "Backend API"; then
    echo "   Backend is healthy and ready"
else
    echo "   ❌ Backend is not responding"
    echo "   Check logs: docker-compose logs backend"
fi

# Check frontend
if check_service "http://localhost:3000" "Frontend"; then
    echo "   Frontend is serving correctly"
else
    echo "   ❌ Frontend is not responding"
    echo "   Check logs: docker-compose logs frontend"
fi

# Check pgAdmin
if check_service "http://localhost:5050" "pgAdmin"; then
    echo "   pgAdmin is available for database management"
else
    echo "   ❌ pgAdmin is not responding"
    echo "   Check logs: docker-compose logs pgadmin"
fi

# Check database connectivity
echo ""
echo "🗄️  Testing database connection..."
if docker-compose exec -T postgres pg_isready -U postgres -d project_management >/dev/null 2>&1; then
    echo "✅ PostgreSQL database is accessible"
    
    # Check if tables exist
    table_count=$(docker-compose exec -T postgres psql -U postgres -d project_management -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' \n\r')
    
    if [ "$table_count" -gt 0 ]; then
        echo "✅ Database schema is initialized ($table_count tables)"
    else
        echo "⚠️  Database schema needs to be initialized"
        echo "   Run: docker-compose exec backend npm run migrate"
    fi
else
    echo "❌ Cannot connect to PostgreSQL database"
    echo "   Check logs: docker-compose logs postgres"
fi

# Test API endpoints
echo ""
echo "🔌 Testing API endpoints..."

# Test health endpoint
if curl -s "http://localhost:3001/health" | grep -q '"status":"OK"'; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint not working"
fi

# Summary
echo ""
echo "📊 Setup Verification Summary:"
echo "================================"
echo ""

if docker-compose ps | grep -q "Up.*Up.*Up.*Up"; then
    echo "✅ All containers are running"
else
    echo "⚠️  Some containers may not be running properly"
    echo "   Check: docker-compose ps"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   pgAdmin:   http://localhost:5050"
echo ""
echo "🗄️  Database Connection:"
echo "   Host:     localhost"
echo "   Port:     5432" 
echo "   Database: project_management"
echo "   Username: postgres"
echo "   Password: postgres123"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Reset data:   docker-compose down -v"
echo ""

# Check if everything is working
if check_service "http://localhost:3001/health" "Backend" >/dev/null 2>&1 && 
   check_service "http://localhost:3000" "Frontend" >/dev/null 2>&1 && 
   docker-compose exec -T postgres pg_isready -U postgres -d project_management >/dev/null 2>&1; then
    echo "🎉 Project Management Platform is fully operational!"
    echo ""
    echo "You can now:"
    echo "1. Access the frontend at http://localhost:3000"
    echo "2. Use pgAdmin at http://localhost:5050 to manage the database"
    echo "3. Test the API endpoints at http://localhost:3001"
    echo "4. Start developing your UI components"
else
    echo "⚠️  Some services may need attention. Check the logs above."
fi