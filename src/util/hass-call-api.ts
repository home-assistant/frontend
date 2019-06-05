import { fetchWithAuth } from "./fetch-with-auth";
import { Auth } from "home-assistant-js-websocket";

export const handleFetchPromise = async <T>(
  fetchPromise: Promise<Response>
): Promise<T> => {
  let response;

  try {
    response = await fetchPromise;
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
      body,
    };
  }

  return (body as unknown) as T;
};

export default async function hassCallApi<T>(
  auth: Auth,
  method: string,
  path: string,
  parameters?: {}
) {
  const url = `${auth.data.hassUrl}/api/${path}`;

  const init: RequestInit = {
    method,
    headers: {},
  };

  if (parameters) {
    // @ts-ignore
    init.headers["Content-Type"] = "application/json;charset=UTF-8";
    init.body = JSON.stringify(parameters);
  }

  return handleFetchPromise<T>(fetchWithAuth(auth, url, init));
}
