#!/bin/bash
# Copy mxGraph to public directory after npm install
echo "Copying mxGraph to public directory..."
mkdir -p public
cp -r node_modules/mxgraph/javascript public/mxgraph
echo "mxGraph copied successfully!"
