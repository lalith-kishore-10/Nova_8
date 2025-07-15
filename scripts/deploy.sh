#!/bin/bash

# Production deployment script

set -e

echo "🚀 Deploying Git Repository Explorer to production..."

# Configuration
IMAGE_NAME="git-repo-explorer"
CONTAINER_NAME="git-repo-explorer-prod"
PORT=${PORT:-80}

# Build production image
echo "🔨 Building production image..."
docker build -t $IMAGE_NAME:latest --target production .

# Stop existing container if running
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "🛑 Stopping existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

# Run new container
echo "🚀 Starting new container..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:80 \
    --restart unless-stopped \
    --env-file .env \
    $IMAGE_NAME:latest

# Health check
echo "🏥 Performing health check..."
sleep 5

if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at http://localhost:$PORT"
else
    echo "❌ Health check failed. Check logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Show container status
echo ""
echo "📊 Container status:"
docker ps -f name=$CONTAINER_NAME

echo ""
echo "📋 Useful commands:"
echo "   View logs: docker logs -f $CONTAINER_NAME"
echo "   Stop: docker stop $CONTAINER_NAME"
echo "   Restart: docker restart $CONTAINER_NAME"