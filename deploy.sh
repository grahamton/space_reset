#!/bin/bash

# Space Reset Coach - Quick Deployment Script
# Usage: bash deploy.sh [vercel|netlify|build]

set -e

echo "🚀 Space Reset Coach - Deployment Helper"
echo "========================================"

DEPLOY_METHOD=${1:-vercel}

case $DEPLOY_METHOD in
  vercel)
    echo "📦 Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
      echo "❌ Vercel CLI not found. Install with:"
      echo "   npm install -g vercel"
      exit 1
    fi
    
    echo "🔨 Building production bundle..."
    npm run build
    
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    echo "✅ Deployed to Vercel!"
    echo "📍 Check vercel.com for your deployment URL"
    ;;
    
  netlify)
    echo "📦 Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
      echo "❌ Netlify CLI not found. Install with:"
      echo "   npm install -g netlify-cli"
      exit 1
    fi
    
    echo "🔨 Building production bundle..."
    npm run build
    
    echo "🚀 Deploying to Netlify..."
    netlify deploy --prod --dir=dist
    
    echo "✅ Deployed to Netlify!"
    echo "📍 Check netlify.com for your deployment URL"
    ;;
    
  build)
    echo "🔨 Building production bundle..."
    npm run build
    
    echo "✅ Production build complete!"
    echo "📦 Output: dist/"
    echo ""
    echo "Next steps:"
    echo "1. Upload dist/ folder to your server"
    echo "2. Configure web server to serve index.html for all routes"
    echo "3. Enable gzip compression"
    echo "4. Enable browser caching for static assets"
    ;;
    
  test)
    echo "🧪 Running all tests..."
    npm run test
    
    echo "✅ All tests passed!"
    ;;
    
  preview)
    echo "🔨 Building production bundle..."
    npm run build
    
    echo "👀 Preview production build at http://localhost:4173"
    npm run preview
    ;;
    
  *)
    echo "Usage: bash deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  vercel    - Deploy to Vercel (recommended)"
    echo "  netlify   - Deploy to Netlify"
    echo "  build     - Create production build (dist/)"
    echo "  test      - Run all tests"
    echo "  preview   - Preview production build locally"
    echo ""
    echo "Examples:"
    echo "  bash deploy.sh vercel"
    echo "  bash deploy.sh build"
    echo "  bash deploy.sh test"
    exit 1
    ;;
esac

echo ""
echo "🎉 Deployment script complete!"
