import * as HAWS from 'home-assistant-js-websocket';

window.HAWS = HAWS;
window.HASS_DEMO = __DEMO__;

function init(password) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${window.location.host}/api/websocket`;
  const options = {};
  if (password) {
    options.authToken = password;
  }
  return HAWS.createConnection(url, options)
    .then(function (conn) {
      HAWS.subscribeEntities(conn);
      HAWS.subscribeConfig(conn);
      return conn;
    });
}

if (window.noAuth) {
  window.hassConnection = init();
} else {
  window.hassConnection = null;
}
