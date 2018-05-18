export default function hassCallApi (host, auth, method, path, parameters) {
  var url = host + '/api/' + path;

  return new Promise(function (resolve, reject) {
    var req = new XMLHttpRequest();
    req.open(method, url, true);

    if (auth.authToken) {
      req.setRequestHeader('X-HA-access', auth.authToken);
    } else if (auth.accessToken) {
      req.setRequestHeader('authorization', `Bearer ${auth.accessToken}`);
    }

    req.onload = function () {
      var body = req.responseText;

      if (req.getResponseHeader('content-type') === 'application/json') {
        try {
          body = JSON.parse(req.responseText);
        } catch (err) {
          reject({
            error: 'Unable to parse JSON response',
            status_code: req.status,
            body: body,
          });
          return;
        }
      }

      if (req.status > 199 && req.status < 300) {
        resolve(body);
      } else {
        reject({
          error: 'Response error: ' + req.status,
          status_code: req.status,
          body: body
        });
      }
    };

    req.onerror = function () {
      reject({
        error: 'Request error',
        status_code: req.status,
        body: req.responseText,
      });
    };

    if (parameters) {
      req.setRequestHeader('Content-Type', 'application;charset=UTF-8');
      req.send(JSON.stringify(parameters));
    } else {
      req.send();
    }
  });
};
