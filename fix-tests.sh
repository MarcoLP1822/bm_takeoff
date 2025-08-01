#!/bin/bash
# Script per correggere tutti i test TypeScript per Next.js 15

# Correzione per variationId
find . -name "route.test.ts" -exec sed -i 's/params: { variationId: "var-123" }/params: Promise.resolve({ variationId: "var-123" })/g' {} \;

# Correzione per platform
find . -name "route.test.ts" -exec sed -i 's/params: { platform: "twitter" }/params: Promise.resolve({ platform: "twitter" })/g' {} \;
find . -name "route.test.ts" -exec sed -i 's/params: { platform: "invalid" }/params: Promise.resolve({ platform: "invalid" })/g' {} \;

# Correzione per postId con struttura differente
find . -name "route.test.ts" -exec sed -i 's/params: { postId: "post-123" }/params: Promise.resolve({ postId: "post-123" })/g' {} \;

echo "Correzioni applicate"
