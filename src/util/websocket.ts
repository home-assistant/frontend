import type { Connection, MessageBase } from "home-assistant-js-websocket";

let _debugConnection = __DEV__;

export const setDebugConnection = (debug: boolean) => {
  _debugConnection = debug;
};

export const callWS = <T>(
  connection: Connection,
  msg: MessageBase
): Promise<T> => {
  if (_debugConnection) {
    // eslint-disable-next-line no-console
    console.log("Sending", msg);
  }

  const response = connection.sendMessagePromise<T>(msg);

  if (_debugConnection) {
    response.then(
      // eslint-disable-next-line no-console
      (result) => console.log("Received", result),
      // eslint-disable-next-line no-console
      (err) => console.error("Error", err)
    );
  }
  return response;
};
