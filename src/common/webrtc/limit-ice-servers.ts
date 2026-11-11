import { ensureArray } from "../array/ensure-array";

const isTurn = (url: string) => url.startsWith("turn");

const isTcpTurn = (url: string) =>
  url.startsWith("turns:") || url.includes("transport=tcp");

const isTls443 = (url: string) =>
  url.startsWith("turns:") && /:443(\?|$)/.test(url);

// "turn:host:3478?transport=udp" -> "host"
const getHost = (url: string) =>
  url
    .replace(/^[a-z]+:/i, "")
    .replace(/\?.*$/, "")
    .replace(/:\d+$/, "")
    .toLowerCase();

/**
 * Reduces the URLs of every ICE server to one STUN URL, one UDP TURN URL and
 * one TCP TURN URL (preferring TLS on port 443, which passes most firewalls)
 * per host.
 *
 * The browser gathers a candidate for every URL on every network interface and
 * checks each of them against every remote candidate. Redundant URLs of the
 * same host do not add a new network path, but multiply the number of checks
 * and delay the connection by many seconds.
 */
export const limitIceServers = (
  iceServers: RTCIceServer[] | undefined
): RTCIceServer[] | undefined =>
  iceServers?.map((server) => {
    const urls = ensureArray(server.urls);
    if (urls.length < 2) {
      return server;
    }
    const hosts = [...new Set(urls.map(getHost))];
    return {
      ...server,
      urls: hosts.flatMap((host) => {
        const hostUrls = urls.filter((url) => getHost(url) === host);
        const turnUrls = hostUrls.filter(isTurn);
        const tcpTurnUrls = turnUrls.filter(isTcpTurn);
        return [
          hostUrls.find((url) => !isTurn(url)),
          turnUrls.find((url) => !isTcpTurn(url)),
          tcpTurnUrls.find(isTls443) ??
            tcpTurnUrls.find((url) => url.startsWith("turns:")) ??
            tcpTurnUrls[0],
        ].filter((url) => url !== undefined);
      }),
    };
  });

// "turns:host" -> "turns:host:5349?transport=tcp", browsers report the URL of
// a candidate with the port and transport that were left out
const normalizeUrl = (url: string) => {
  const scheme = url.slice(0, url.indexOf(":")).toLowerCase();
  const port =
    /:(\d+)(\?|$)/.exec(url)?.[1] ?? (scheme.endsWith("s") ? "5349" : "3478");
  const transport =
    /[?&]transport=(\w+)/i.exec(url)?.[1].toLowerCase() ??
    (scheme === "turns" ? "tcp" : "udp");
  return `${scheme}:${getHost(url)}:${port}?transport=${transport}`;
};

/** The network path a connection uses, without `relayUrl` it is direct. */
export interface IcePath {
  relayUrl?: string;
}

/**
 * Reduces the ICE servers to what a new connection needs to take the same
 * path as a connection that is already running: only the TURN URL it relays
 * over, or no TCP TURN URLs when it is direct. The UDP TURN URLs stay, as
 * browsers also use them to find their public address.
 *
 * Returns `undefined` if the relay is not part of the ICE servers.
 */
export const limitIceServersToPath = (
  iceServers: RTCIceServer[] | undefined,
  path: IcePath
): RTCIceServer[] | undefined => {
  const { relayUrl } = path;
  if (relayUrl) {
    const normalizedUrl = normalizeUrl(relayUrl);
    for (const server of iceServers ?? []) {
      const url = ensureArray(server.urls).find(
        (serverUrl) => normalizeUrl(serverUrl) === normalizedUrl
      );
      if (url) {
        return [{ ...server, urls: [url] }];
      }
    }
    return undefined;
  }
  return limitIceServers(iceServers)
    ?.map((server) => ({
      ...server,
      urls: ensureArray(server.urls).filter((url) => !isTcpTurn(url)),
    }))
    .filter((server) => server.urls.length);
};
