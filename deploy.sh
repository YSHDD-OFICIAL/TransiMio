#!/bin/bash

echo "🚀 Iniciando despliegue de TransiMio..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Build backend
echo "📦 Building backend..."
cd backend
npm run build
cd ..

# Build and push Docker images
echo "🐳 Building Docker images..."
docker-compose build

# Run migrations
echo "🗄️ Running database migrations..."
docker-compose run backend npm run migrate

# Deploy with Docker Compose
echo "🚀 Starting services..."
docker-compose up -d

# Health check
echo "🏥 Running health checks..."
sleep 10
curl -f http://localhost:5000/health || exit 1

echo "✅ TransiMio desplegado exitosamente!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:5000"
