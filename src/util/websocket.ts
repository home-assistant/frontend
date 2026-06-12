import type { Connection, MessageBase } from "home-assistant-js-websocket";

let _debugConnection = __DEV__;

export const setDebugConnection = (debug: boolean) => {
  _debugConnection = debug;
};

export const callWS = <T>(
  connection: Connection,
  msg: MessageBase
): Promise<T> => {
  const response = connection.sendMessagePromise<T>(msg);

  if (_debugConnection) {
    // eslint-disable-next-line no-console
    console.log(`⬆️ Sent #${msg.id}`, msg);
  }

  if (_debugConnection) {
    response.then(
      (result) =>
        // eslint-disable-next-line no-console
        console.log(
          `⬇️ Received #${msg.id}`,
          result && typeof result === "object"
            ? JSON.parse(JSON.stringify(result))
            : result
        ),
      // eslint-disable-next-line no-console
      (err) => console.error(`❌ Error #${msg.id}`, err)
    );
  }
  return response;
};
