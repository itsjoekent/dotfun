#!/bin/bash

# Build script for word-field
# Compiles TypeScript, builds with Vite, and copies dist to letter-strike subdirectory

set -e  # Exit on error

# Run TypeScript compilation
tsc -b

# Build with Vite
vite build

# Create letter-strike directory
mkdir -p dist/letter-strike

# Copy dist files to letter-strike subdirectory
# Try rsync first, fallback to find/cp if rsync is not available
if command -v rsync &> /dev/null; then
  rsync -av --exclude='letter-strike' dist/ dist/letter-strike/
else
  cd dist && find . -maxdepth 1 ! -name '.' ! -name 'letter-strike' -exec cp -r {} letter-strike/ \;
fi
