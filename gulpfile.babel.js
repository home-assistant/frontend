var requireDir = require('require-dir');

requireDir('./gulp/tasks/');

/*

TODO

Add build for Hass.io panel.

      Target: './build-temp/hassio-main.html',

      stripExcludes: [
        'bower_components/font-roboto/roboto.html',
        'bower_components/paper-styles/color.html',
        'bower_components/polymer/polymer.html',
        'bower_components/iron-meta/iron-meta.html',
      ]

*/
