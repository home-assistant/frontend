FROM node:8.11.1-alpine

# install yarn
ENV PATH /root/.yarn/bin:$PATH

## Install/force base tools
RUN apk update \
  && apk add make g++ curl bash binutils tar git python2 python3 \
  && rm -rf /var/cache/apk/* \
  && /bin/bash \
  && touch ~/.bashrc

## Install yarn
RUN curl -o- -L https://yarnpkg.com/install.sh | bash

## Setup the project
RUN mkdir -p /frontend

WORKDIR /frontend

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

COPY script/docker_entrypoint.sh /usr/bin/docker_entrypoint.sh

RUN chmod +x /usr/bin/docker_entrypoint.sh

CMD [ "docker_entrypoint.sh" ]
