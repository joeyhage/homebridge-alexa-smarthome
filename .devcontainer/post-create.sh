#!/usr/bin/env bash
set -euxo pipefail

# Permissions
sudo chown -c "$(id -u):$(id -g)" \
    /workspaces \
    node_modules \
    "$HOME"/.homebridge

npm install -g rust-just@1.43.1
