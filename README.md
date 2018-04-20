# Home Assistant Polymer [![Build Status](https://travis-ci.org/home-assistant/home-assistant-polymer.svg?branch=master)](https://travis-ci.org/home-assistant/home-assistant-polymer)

This is the repository for the official [Home Assistant](https://home-assistant.io) frontend. The frontend is built on top of the following technologies:

 * [Websockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
 * [Polymer](https://www.polymer-project.org/)
 * [Rollup](http://rollupjs.org/) to package Home Assistant JS
 * [Bower](https://bower.io) for Polymer package management

[![Screenshot of the frontend](https://raw.githubusercontent.com/home-assistant/home-assistant-polymer/master/docs/screenshot.png)](https://home-assistant.io/demo/)

[View demo of the Polymer frontend](https://home-assistant.io/demo/)  
[More information about Home Assistant](https://home-assistant.io)  
[Frontend development instructions](https://home-assistant.io/developers/frontend/)

## Frontend development

### Classic environment
A complete guide can be found at the following [link](https://www.home-assistant.io/developers/frontend/). It describes a short guide for the build of project.

### Docker environment
It is possible to compile the project and/or run commands in the development environment having only the [Docker](https://www.docker.com) pre-installed in the system. On the root of project you can do:
* `sh ./script/docker_run.sh build` Build all the project with one command
* `sh ./script/docker_run.sh bash` Open an interactive shell (the same environment generated by the *classic environment*) where you can run commands. This bash work on your project directory and any change on your file is automatically present within your build bash.

**Note**: if you have installed `npm` in addition to the `docker`, you can use the commands `npm run docker_build` and `npm run bash` to get a full build or bash as explained above

## License
Home Assistant is open-source and Apache 2 licensed. Feel free to browse the repository, learn and reuse parts in your own projects.
