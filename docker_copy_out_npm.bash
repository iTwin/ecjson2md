#!/bin/bash
IMAGE_NAME=$1
TARGET_PATH=$2

# Get the container ID
CONTAINER_ID=$(echo $(docker ps --no-trunc -aqf "ancestor=$IMAGE_NAME") | awk '{print $1}')

# Echo path for debugging
echo "Container ID:"
echo "$CONTAINER_ID:/npm_package/"

# Copy repo out of docker container
docker cp "$CONTAINER_ID:/npm_package/" $TARGET_PATH