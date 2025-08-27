#!/bin/bash

# Copy domain and types libraries to functions src/lib
echo "Copying domain and types libraries..."
cp -r ../../libs/domain/src/lib/* ./src/lib/
cp -r ../../libs/types/src/lib/* ./src/lib/

# Build the functions
echo "Building functions..."
npx nx build functions
