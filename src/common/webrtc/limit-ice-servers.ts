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
