import hass from './home-assistant-js-instance';

import nuclearObserver from './nuclear-behavior';

export default nuclearObserver(hass.reactor);
