export default function hassCallApi(host, auth, method, path, parameters, responseType = '') {
  const url = `${host}/api/${path}`;

  return new Promise(function (resolve, reject) {
    const req = new XMLHttpRequest();
    req.responseType = responseType;
    req.open(method, url, true);
    req.setRequestHeader('authorization', `Bearer ${auth.accessToken}`);

    req.onload = function () {
      let body = req.response;
      if (responseType === '' || responseType === 'text') {
        const contentType = req.getResponseHeader('content-type');

        if (contentType && contentType.indexOf('application/json') !== -1) {
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
      req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      req.send(JSON.stringify(parameters));
    } else {
      req.send();
    }
  });
}
