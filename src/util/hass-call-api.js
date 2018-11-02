import { fetchWithAuth } from "./fetch-with-auth";

/* eslint-disable no-throw-literal */

export default async function hassCallApi(auth, method, path, parameters) {
  const url = `${auth.data.hassUrl}/api/${path}`;

  const init = {
    method: method,
    headers: {},
  };

  if (parameters) {
    init.headers["Content-Type"] = "application/json;charset=UTF-8";
    init.body = JSON.stringify(parameters);
  }

  let response;

  try {
    response = await fetchWithAuth(auth, url, init);
  } catch (err) {
    throw {
      error: "Request error",
      status_code: undefined,
      body: undefined,
    };
  }

  let body = null;

  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch (err) {
      throw {
        error: "Unable to parse JSON response",
        status_code: err.status,
        body: null,
      };
    }
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    throw {
      error: `Response error: ${response.status}`,
      status_code: response.status,
      body: body,
    };
  }

  return body;
}
