FROM node:8.2.1-alpine

# install yarn
ENV PATH /root/.yarn/bin:$PATH

RUN apk update \
  && apk add curl bash binutils tar git python3 \
  && rm -rf /var/cache/apk/* \
  && /bin/bash \
  && touch ~/.bashrc \
  && curl -o- -L https://yarnpkg.com/install.sh | bash

RUN mkdir -p /frontend
WORKDIR /frontend

ENV NODE_ENV production

COPY package.json ./
RUN yarn

COPY bower.json ./
RUN ./node_modules/.bin/bower install --allow-root

COPY . .
CMD [ "/bin/bash", "./script/build_frontend" ]
