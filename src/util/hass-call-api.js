import { fetchWithAuth } from './fetch-with-auth.js';

export default function hassCallApi(host, auth, method, path, parameters) {
  const url = `${host}/api/${path}`;

  const init = {
    method: method,
    headers: {},
  };
  if (parameters) {
    init.headers['Content-Type'] = 'application/json;charset=UTF-8';
    init.body = JSON.stringify(parameters);
  }
  return fetchWithAuth(auth, url, init)
    .then(function (response) {
      let body = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        try {
          body = response.json();
        } catch (err) {
          return Promise.reject({
            error: 'Unable to parse JSON response',
            status_code: err.status,
            body: body,
          });
        }
      } else {
        body = response.text();
      }
      if (response.status > 199 && response.status < 300) {
        return body;
      }
      return Promise.reject({
        error: `Response error: ${response.status}`,
        status_code: response.status,
        body: body
      });
    })
    .catch(function (req) {
      return Promise.reject({
        error: 'Request error',
        status_code: req.status,
        body: req.text(),
      });
    });
}
