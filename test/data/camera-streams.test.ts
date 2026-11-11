import { describe, expect, it } from "vitest";
import {
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

    // Loading: HLS is shown until WebRTC is ready, unless WebRTC goes first
    expect(select({})).toBe("hls (web_rtc)");
    expect(select({ hlsStreams: ok })).toBe("hls (web_rtc)");
    expect(select({ webRtcFirst: true })).toBe("web_rtc");
    expect(select({ webRtcFirst: true, hlsStreams: ok })).toBe("hls (web_rtc)");
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
