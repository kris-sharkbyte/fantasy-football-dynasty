# Copy domain and types libraries to functions src/lib
Write-Host "Copying domain and types libraries..."
Copy-Item -Path "../../libs/domain/src/lib/*" -Destination "./src/lib/" -Recurse -Force
Copy-Item -Path "../../libs/types/src/lib/*" -Destination "./src/lib/" -Recurse -Force

# Build the functions
Write-Host "Building functions..."
npx nx build functions
