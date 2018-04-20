#!/bin/bash
# Docker entry point inspired by travis build and script/build_frontend

# Stop on errors
set -e

# Build the frontend but not used the npm run build
/bin/bash script/build_frontend

# TEST
npm run test

#
#xvfb-run wct
