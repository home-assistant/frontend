import { describe, expect, it } from "vitest";
import { limitIceServers } from "../../../src/common/webrtc/limit-ice-servers";

// Redundant URLs cost seconds of connection time, while dropping the wrong
// one (the UDP or the firewall friendly TLS relay) breaks remote access.
describe("limitIceServers", () => {
  it("works", () => {
    expect(limitIceServers(undefined)).toBeUndefined();
    expect(
      limitIceServers([
        { urls: "stun:stun.example.com:3478" },
        { urls: ["stun:a.example.com:3478", "stun:a.example.com:80"] },
        {
          urls: [
            "turn:t.example.com:3478?transport=udp",
            "turn:t.example.com:3478?transport=tcp",
            "turns:t.example.com:5349?transport=tcp",
            "turn:t.example.com:443?transport=udp",
            "turn:t.example.com:80?transport=tcp",
            "turns:t.example.com:443?transport=tcp",
          ],
          username: "user",
          credential: "secret",
        },
        {
          urls: [
            "turn:u.example.com:80?transport=tcp",
            "turn:u.example.com:443?transport=tcp",
          ],
        },
        // Different hosts are different network paths, all are kept
        {
          urls: [
            "stun:v.example.com",
            "turn:v.example.com:3478",
            "turn:v.example.com:3479",
            "turn:w.example.com:3478",
          ],
        },
      ])
    ).toEqual([
      { urls: "stun:stun.example.com:3478" },
      { urls: ["stun:a.example.com:3478"] },
      {
        urls: [
          "turn:t.example.com:3478?transport=udp",
          "turns:t.example.com:443?transport=tcp",
        ],
        username: "user",
        credential: "secret",
      },
      { urls: ["turn:u.example.com:80?transport=tcp"] },
      {
        urls: [
          "stun:v.example.com",
          "turn:v.example.com:3478",
          "turn:w.example.com:3478",
        ],
      },
    ]);
  });
});
