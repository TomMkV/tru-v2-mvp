#!/bin/bash
# TRU Platform v2 - Simple Deployment Script
# Run this ON THE LAMBDA VM to pull latest code and redeploy

set -e

echo "🚀 Deploying TRU Platform v2..."
echo ""

# Navigate to repo
cd ~/tru-v2-mvp

# Stash any local changes
git stash

# Pull latest
echo "📥 Pulling latest code..."
git pull origin main

# Rebuild containers
echo "🔨 Rebuilding containers..."
cd infrastructure
docker-compose down
docker-compose up -d --build

# Wait for health
echo "⏳ Waiting for services..."
sleep 10

# Check health
echo "🧪 Testing deployment..."
./test-deployment.sh

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Access:"
echo "  Frontend: http://$(curl -s ifconfig.me):3000"
echo "  API:      http://$(curl -s ifconfig.me):8000/docs"
echo ""

