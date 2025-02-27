#!/bin/bash

# Define the directory name
DIR="build"

# Ensure the build directory exists
if [ ! -d "$DIR" ]; then
  echo "Creating directory: $DIR"
  mkdir "$DIR"
else
  echo "Directory $DIR already exists"
fi

# Run the OpenAPI static validator
echo "Running OpenAPI Static Validator..."
./node_modules/.bin/openapi-static-validator api.json > ./build/validator.js

echo "Validation complete. Output saved to ./build/validator.js"
