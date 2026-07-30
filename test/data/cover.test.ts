import { describe, expect, it } from "vitest";

import type { CoverEntity } from "../../src/data/cover";
import {
  canClose,
  canOpen,
  canStop,
  canStopTilt,
  CoverEntityFeature,
} from "../../src/data/cover";

interface MockCoverOptions {
  state: string;
  supportedFeatures: number;
  assumedState?: boolean;
  currentPosition?: number;
}

const mockCover = (options: MockCoverOptions): CoverEntity => {
  const attributes: Record<string, any> = {
    supported_features: options.supportedFeatures,
  };
  if (options.assumedState !== undefined) {
    attributes.assumed_state = options.assumedState;
  }
  if (options.currentPosition !== undefined) {
    attributes.current_position = options.currentPosition;
  }
  return {
    entity_id: "cover.test",
    state: options.state,
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    context: { id: "1", parent_id: null, user_id: null },
    attributes,
  } as CoverEntity;
};

// A motor-style cover exposes a stop action.
const MOTOR =
  // eslint-disable-next-line no-bitwise
  CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE | CoverEntityFeature.STOP;

// A blind-style cover has open/close but no stop.
// eslint-disable-next-line no-bitwise
const NO_STOP = CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE;

describe("cover button availability", () => {
  describe("canStop", () => {
    it("is disabled when the cover is idle (open)", () => {
      expect(
        canStop(mockCover({ state: "open", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is disabled when the cover is idle (closed)", () => {
      expect(
        canStop(mockCover({ state: "closed", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is enabled while opening", () => {
      expect(
        canStop(mockCover({ state: "opening", supportedFeatures: MOTOR }))
      ).toBe(true);
    });

    it("is enabled while closing", () => {
      expect(
        canStop(mockCover({ state: "closing", supportedFeatures: MOTOR }))
      ).toBe(true);
    });

    it("is disabled when unavailable", () => {
      expect(
        canStop(mockCover({ state: "unavailable", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is enabled for an assumed-state cover regardless of movement", () => {
      expect(
        canStop(
          mockCover({
            state: "open",
            supportedFeatures: MOTOR,
            assumedState: true,
          })
        )
      ).toBe(true);
    });
  });

  describe("canOpen", () => {
    it("is enabled when closed and idle", () => {
      expect(
        canOpen(mockCover({ state: "closed", supportedFeatures: MOTOR }))
      ).toBe(true);
    });

    it("is disabled when fully open", () => {
      expect(
        canOpen(mockCover({ state: "open", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is disabled while already opening", () => {
      expect(
        canOpen(mockCover({ state: "opening", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is disabled while closing when a stop action exists (motor must stop first)", () => {
      expect(
        canOpen(mockCover({ state: "closing", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("stays enabled while closing when there is no stop action (instant reverse)", () => {
      expect(
        canOpen(mockCover({ state: "closing", supportedFeatures: NO_STOP }))
      ).toBe(true);
    });

    it("is enabled for an assumed-state cover while closing", () => {
      expect(
        canOpen(
          mockCover({
            state: "closing",
            supportedFeatures: MOTOR,
            assumedState: true,
          })
        )
      ).toBe(true);
    });

    it("is disabled when unavailable", () => {
      expect(
        canOpen(mockCover({ state: "unavailable", supportedFeatures: MOTOR }))
      ).toBe(false);
    });
  });

  describe("canClose", () => {
    it("is enabled when open and idle", () => {
      expect(
        canClose(mockCover({ state: "open", supportedFeatures: MOTOR }))
      ).toBe(true);
    });

    it("is disabled when fully closed", () => {
      expect(
        canClose(mockCover({ state: "closed", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is disabled while already closing", () => {
      expect(
        canClose(mockCover({ state: "closing", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is disabled while opening when a stop action exists (motor must stop first)", () => {
      expect(
        canClose(mockCover({ state: "opening", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("stays enabled while opening when there is no stop action (instant reverse)", () => {
      expect(
        canClose(mockCover({ state: "opening", supportedFeatures: NO_STOP }))
      ).toBe(true);
    });

    it("is enabled for an assumed-state cover while opening", () => {
      expect(
        canClose(
          mockCover({
            state: "opening",
            supportedFeatures: MOTOR,
            assumedState: true,
          })
        )
      ).toBe(true);
    });

    it("is disabled when unavailable", () => {
      expect(
        canClose(mockCover({ state: "unavailable", supportedFeatures: MOTOR }))
      ).toBe(false);
    });
  });

  describe("canStopTilt", () => {
    const TILT =
      // eslint-disable-next-line no-bitwise
      CoverEntityFeature.OPEN |
      CoverEntityFeature.CLOSE |
      CoverEntityFeature.STOP |
      CoverEntityFeature.OPEN_TILT |
      CoverEntityFeature.CLOSE_TILT |
      CoverEntityFeature.STOP_TILT;

    it("is disabled when the cover is idle (open)", () => {
      expect(
        canStopTilt(mockCover({ state: "open", supportedFeatures: TILT }))
      ).toBe(false);
    });

    it("is disabled when the cover is idle (closed)", () => {
      expect(
        canStopTilt(mockCover({ state: "closed", supportedFeatures: TILT }))
      ).toBe(false);
    });

    it("is enabled while opening", () => {
      expect(
        canStopTilt(mockCover({ state: "opening", supportedFeatures: TILT }))
      ).toBe(true);
    });

    it("is enabled while closing", () => {
      expect(
        canStopTilt(mockCover({ state: "closing", supportedFeatures: TILT }))
      ).toBe(true);
    });

    it("is disabled when idle on a non-tilt cover (drives the combined stop button)", () => {
      expect(
        canStopTilt(mockCover({ state: "closed", supportedFeatures: MOTOR }))
      ).toBe(false);
    });

    it("is enabled for an assumed-state cover regardless of movement", () => {
      expect(
        canStopTilt(
          mockCover({
            state: "open",
            supportedFeatures: TILT,
            assumedState: true,
          })
        )
      ).toBe(true);
    });

    it("is disabled when unavailable", () => {
      expect(
        canStopTilt(
          mockCover({ state: "unavailable", supportedFeatures: TILT })
        )
      ).toBe(false);
    });
  });
});
