import '@polymer/paper-styles/typography.js';

import '../../src/resources/hass-icons.js';
import '../../src/resources/ha-style.js';
// We don't have static mapped yet
// import '../../src/resources/roboto.js';
import '../../src/components/ha-iconset-svg.js';

import './ha-gallery.js';

// Temp roboto fix
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css?family=Roboto';
link.rel = 'stylesheet';
document.head.appendChild(link);

document.body.appendChild(document.createElement('ha-gallery'));
