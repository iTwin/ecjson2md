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

# Get the file package archive
PACKAGE_FILE=$(find $TARGET_PATH/npm_package/bentley-ecjson2md-*.tgz)

# Get the version from the archive
PACKAGE_VERSION=`echo $PACKAGE_FILE | cut -d "-" -f3 | cut -c 1-5`

echo "Local package version: $PACKAGE_VERSION"

# Set the TFS variable in the build definition
echo '##vso[task.setvariable variable=localVersion;]'$PACKAGE_VERSION