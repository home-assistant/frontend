# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.148.1/containers/python-3/.devcontainer/base.Dockerfile
FROM mcr.microsoft.com/vscode/devcontainers/python:0-3.9

ENV \
  DEBIAN_FRONTEND=noninteractive \
  DEVCONTAINER=true \
  PATH=$PATH:./node_modules/.bin

# Install nvm
COPY .nvmrc /tmp/.nvmrc
RUN \
  su vscode -c \
    "source /usr/local/share/nvm/nvm.sh && nvm install $(cat /tmp/.nvmrc) 2>&1"