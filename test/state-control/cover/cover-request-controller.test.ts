import type { ReactiveControllerHost } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoverEntity } from "../../../src/data/cover";
import { CoverEntityFeature } from "../../../src/data/cover";
import { CoverRequestController } from "../../../src/state-control/cover/cover-request-controller";

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

const positionCover = (state: string, position: number, tilt?: number) =>
  ({
    entity_id: "cover.living_room",
    state,
    attributes: {
      supported_features: CoverEntityFeature.SET_POSITION,
      current_position: position,
      current_tilt_position: tilt,
    },
  }) as CoverEntity;

const openCloseCover = (state: string) =>
  ({
    entity_id: "cover.garage",
    state,
    attributes: {},
  }) as CoverEntity;

describe("CoverRequestController", () => {
  let controller: CoverRequestController;

  beforeEach(() => {
    controller = new CoverRequestController(createHost());
  });

  it("keeps the request until the cover reaches the value", () => {
    controller.commandSent(
      { mode: "position", action: "set", value: 40 },
      positionCover("open", 100)
    );
    expect(controller.request).toEqual({ mode: "position", value: 40 });

    controller.stateChanged(positionCover("closing", 70));
    expect(controller.request).toEqual({ mode: "position", value: 40 });

    controller.stateChanged(positionCover("open", 40));
    expect(controller.request).toBeUndefined();
  });

  it("has no request when the cover is already at the value", () => {
    controller.commandSent(
      { mode: "position", action: "close" },
      positionCover("closed", 0)
    );
    expect(controller.request).toBeUndefined();
  });

  it("keeps the request while the cover has not reacted yet", () => {
    controller.commandSent(
      { mode: "position", action: "set", value: 40 },
      positionCover("open", 100)
    );
    controller.stateChanged(positionCover("open", 100));
    expect(controller.request).toEqual({ mode: "position", value: 40 });
  });

  it("drops the request when a moving cover stops somewhere else", () => {
    controller.commandSent(
      { mode: "position", action: "set", value: 40 },
      positionCover("open", 100)
    );
    controller.stateChanged(positionCover("closing", 80));
    controller.stateChanged(positionCover("open", 65));
    expect(controller.request).toBeUndefined();
  });

  it("drops the request when the position changes without the cover reporting moving", () => {
    controller.commandSent(
      { mode: "position", action: "set", value: 40 },
      positionCover("open", 100)
    );
    controller.stateChanged(positionCover("open", 80));
    expect(controller.request).toBeUndefined();
  });

  it("follows a cover that only opens and closes", () => {
    controller.commandSent(
      { mode: "position", action: "open" },
      openCloseCover("closed")
    );
    expect(controller.request).toEqual({ mode: "position", value: 100 });

    controller.stateChanged(openCloseCover("opening"));
    expect(controller.request).toEqual({ mode: "position", value: 100 });

    controller.stateChanged(openCloseCover("open"));
    expect(controller.request).toBeUndefined();
  });

  it("only drops the request of the stopped mode", () => {
    const cover = positionCover("open", 100, 100);
    controller.commandSent({ mode: "tilt", action: "set", value: 20 }, cover);

    controller.commandSent({ mode: "position", action: "stop" }, cover);
    expect(controller.request).toEqual({ mode: "tilt", value: 20 });

    controller.commandSent({ mode: "tilt", action: "stop" }, cover);
    expect(controller.request).toBeUndefined();
  });
});
