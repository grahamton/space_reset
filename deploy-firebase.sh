#!/bin/bash

# Space Reset Coach - Firebase Hosting Deployment Script
# Usage: bash deploy-firebase.sh

set -e

echo "🔥 Space Reset Coach - Firebase Deployment"
echo "=========================================="

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI not found."
  echo ""
  echo "Install with:"
  echo "  npm install -g firebase-tools"
  echo ""
  echo "Then login:"
  echo "  firebase login"
  exit 1
fi

# Check if .firebaserc exists
if [ ! -f ".firebaserc" ]; then
  echo "⚠️  .firebaserc not found."
  echo ""
  echo "Setup Firebase:"
  echo "  1. firebase login"
  echo "  2. firebase init"
  echo "  3. Select 'Hosting'"
  echo "  4. Choose your Firebase project"
  echo "  5. Enter 'dist' as public directory"
  echo "  6. Answer 'y' for single-page app"
  echo ""
  exit 1
fi

echo "📦 Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build failed! dist/ directory not found."
  exit 1
fi

echo "✅ Build complete!"
echo ""
echo "📊 Build size:"
du -sh dist/

echo ""
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Your app is live!"
echo ""
echo "Check your Firebase Console:"
echo "  https://console.firebase.google.com"
echo ""
echo "View your app:"
echo "  https://$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4).web.app"
echo ""
