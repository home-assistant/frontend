FROM node:8.9

# install yarn
ENV PATH /root/.yarn/bin:$PATH

RUN apt-get update \
  && apt-get install -y curl bash binutils tar git python3 locales \
  && rm -r /var/lib/apt/lists/*

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
  dpkg-reconfigure --frontend=noninteractive locales && \
  update-locale LANG=en_US.UTF-8

ENV LANG en_US.UTF-8

RUN curl -o- -L https://yarnpkg.com/install.sh | bash

RUN update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 \
  && update-alternatives --install /usr/bin/python python /usr/bin/python3.4 2

RUN mkdir -p /frontend

WORKDIR /frontend

COPY package.json ./

RUN yarn install

COPY bower.json ./

RUN node_modules/.bin/bower install --allow-root

COPY . .

COPY script/docker_entrypoint.sh /usr/bin/docker_entrypoint.sh



RUN chmod +x /usr/bin/docker_entrypoint.sh

CMD [ "docker_entrypoint.sh" ]
