#!/bin/sh

# Change directory to the ghost init dir

# Run ghost as a appuser
export URL=$UFFIZZI_URL
# Start GHOST as appuser
su appuser -c "cd /web/ && /app/bin/ghost config url ${URL} && /app/bin/ghost start"

# Change directory to the folder where ghost is initialized
cd /web/

PATH="$PATH:/app/bin/"

# Start TTYD with zsh
ttyd zsh
