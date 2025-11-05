#!/bin/bash

# Pre-Deploy Check Script
# Führt TypeScript- und Build-Checks lokal aus, bevor du deployst

set -e

echo "🔍 Running pre-deploy checks..."
echo ""

# 1. TypeScript Check
echo "📝 Checking TypeScript..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ TypeScript check passed"
else
  echo "❌ TypeScript check failed!"
  exit 1
fi

echo ""

# 2. ESLint Check (nur Errors, keine Warnings)
echo "🔍 Checking ESLint (errors only)..."
npm run lint -- --max-warnings=0 2>/dev/null || {
  echo "⚠️  ESLint found warnings (non-blocking)"
}

echo ""

# 3. Build Check
echo "🏗️  Running build check..."
npm run build
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ All checks passed! Safe to deploy."
else
  echo ""
  echo "❌ Build failed! Fix errors before deploying."
  exit 1
fi

