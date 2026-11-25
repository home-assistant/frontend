import { describe, expect, it } from "vitest";
import {
  computeCameraStreamStatus,
  selectCameraStreams,
  type CameraStreamSelectionOptions,
} from "../../src/data/camera-streams";

const ok = { hasVideo: true, hasAudio: true };
const silent = { hasVideo: true, hasAudio: false };
const failed = { hasVideo: false, hasAudio: false };

const select = (
  options: Omit<CameraStreamSelectionOptions, "supportedTypes">
) =>
  selectCameraStreams({ supportedTypes: ["web_rtc", "hls"], ...options })
    .map((stream) => (stream.visible ? stream.type : `(${stream.type})`))
    .join(" ");

// The player has no other fallback: a wrong choice here shows a broken or
// silent stream while a working one is available.
describe("selectCameraStreams", () => {
  it("works", () => {
    expect(selectCameraStreams({})).toEqual([]);
    expect(selectCameraStreams({ supportedTypes: [] })).toEqual([
      { type: "mjpeg", visible: true },
    ]);
    expect(
      selectCameraStreams({ supportedTypes: ["hls"], hlsStreams: failed })
    ).toEqual([{ type: "mjpeg", visible: true }]);

    // Loading: HLS is shown until WebRTC is ready
    expect(select({})).toBe("hls (web_rtc)");
    expect(select({ hlsStreams: ok })).toBe("hls (web_rtc)");
    expect(select({ hlsStreams: failed })).toBe("web_rtc");

    // WebRTC loaded: always preferred, also when only HLS has audio
    expect(select({ webRtcStreams: ok })).toBe("web_rtc");
    expect(select({ webRtcStreams: silent, hlsStreams: ok })).toBe("web_rtc");
    expect(select({ webRtcStreams: ok, hlsStreams: failed })).toBe("web_rtc");

    // WebRTC failed
    expect(select({ webRtcStreams: failed })).toBe("hls");
    expect(select({ webRtcStreams: failed, hlsStreams: ok })).toBe("hls");
    expect(select({ webRtcStreams: failed, hlsStreams: failed })).toBe("mjpeg");
  });
});

// The badge over the player tells the user how the stream is connected
describe("computeCameraStreamStatus", () => {
  const hlsLoading = [
    { type: "hls" as const, visible: true },
    { type: "web_rtc" as const, visible: false },
  ];

  it("connects until the shown stream plays", () => {
    expect(computeCameraStreamStatus([], new Set())).toEqual({
      connecting: true,
      hasAudio: false,
    });
    expect(computeCameraStreamStatus(hlsLoading, new Set(), ok)).toEqual({
      type: "hls",
      connecting: true,
      upgrading: undefined,
      hasAudio: false,
    });
  });

  it("shows WebRTC connecting in the background while HLS plays", () => {
    expect(computeCameraStreamStatus(hlsLoading, new Set(["hls"]), ok)).toEqual(
      {
        type: "hls",
        connecting: false,
        upgrading: "web_rtc",
        hasAudio: true,
      }
    );
  });

  it("takes the sound of the shown stream", () => {
    expect(
      computeCameraStreamStatus(
        [{ type: "web_rtc", visible: true }],
        new Set(["web_rtc"]),
        ok,
        silent
      )
    ).toEqual({
      type: "web_rtc",
      connecting: false,
      upgrading: undefined,
      hasAudio: false,
    });
    expect(
      computeCameraStreamStatus(
        [{ type: "mjpeg", visible: true }],
        new Set(["mjpeg"])
      ).hasAudio
    ).toBe(false);
  });
});
