#!/bin/bash

echo "🔍 Checking for remaining Privy API calls..."
echo "============================================"
echo ""

# Check for API calls (should only be in AuthInitializer)
echo "Files with /api/users/privy/ calls:"
grep -r "/api/users/privy/" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" || echo "  ✅ None found (good!)"

echo ""
echo "---"
echo ""

# Check for initializeUser functions (should only be in AuthInitializer)
echo "Files with initializeUser functions:"
grep -r "initializeUser" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" || echo "  ✅ None found (good!)"

echo ""
echo "---"
echo ""

# Check how many components use useAuth
echo "Components using useAuth() hook:"
grep -r "useAuth()" app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | wc -l | xargs echo "  Total:"

echo ""
echo "============================================"
echo "✅ Auth is centralized if:"
echo "   1. Only AuthInitializer.tsx has /api/users/privy/"
echo "   2. All other components use useAuth() hook"
echo "   3. No initializeUser in components"
