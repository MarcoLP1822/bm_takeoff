#!/bin/bash

# Fix all Next.js 15 param issues in test files

echo "Fixing API route test files for Next.js 15 params Promise compatibility..."

# Fix the variationId test file
VARIATION_FILE="app/api/content/variations/[variationId]/__tests__/route.test.ts"
if [ -f "$VARIATION_FILE" ]; then
    echo "Fixing $VARIATION_FILE"
    sed -i 's/params: { variationId: "\([^"]*\)" }/params: Promise.resolve({ variationId: "\1" })/g' "$VARIATION_FILE"
fi

# Fix any remaining platform test files
find app/api -name "route.test.ts" -type f | while read file; do
    if grep -q "params: { platform:" "$file"; then
        echo "Fixing platform params in $file"
        sed -i 's/params: { platform: "\([^"]*\)" }/params: Promise.resolve({ platform: "\1" })/g' "$file"
    fi
    
    if grep -q "params: { postId:" "$file"; then
        echo "Fixing postId params in $file"
        sed -i 's/params: { postId: "\([^"]*\)" }/params: Promise.resolve({ postId: "\1" })/g' "$file"
    fi
    
    if grep -q "params: { accountId:" "$file"; then
        echo "Fixing accountId params in $file"
        sed -i 's/params: { accountId: "\([^"]*\)" }/params: Promise.resolve({ accountId: "\1" })/g' "$file"
    fi
done

echo "API route test param fixes completed!"
