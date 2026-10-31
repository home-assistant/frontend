import { ContextProvider } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  apiContext,
  connectionContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../src/data/context";
import { MediaPlayerEntityFeature } from "../../../src/data/media-player";
import type { MediaPlayerEntity } from "../../../src/data/media-player";
import "../../../src/dialogs/more-info/controls/more-info-media_player";
import type { HaMediaPlayerVolume } from "../../../src/components/media-player/ha-media-player-volume";

// Bundler-defined globals the import graph reads at eval time.
vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

const player = (
  entity_id: string,
  attributes: Partial<MediaPlayerEntity["attributes"]> = {}
) =>
  ({
    entity_id,
    state: "playing",
    attributes: {
      friendly_name: entity_id,
      supported_features:
        MediaPlayerEntityFeature.VOLUME_SET +
        MediaPlayerEntityFeature.VOLUME_MUTE +
        MediaPlayerEntityFeature.GROUPING,
      volume_level: 0.5,
      ...attributes,
    },
  }) as unknown as MediaPlayerEntity;

let hosts: HTMLElement[] = [];

const mount = async (
  stateObj: MediaPlayerEntity,
  states: Record<string, HassEntity>
) => {
  const callService = vi.fn();
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: { localize: (key: string) => key } as never,
  });
  new ContextProvider(host, {
    context: formattersContext,
    initialValue: {
      formatEntityName: (entity: HassEntity) => entity.entity_id,
      formatEntityState: (entity: HassEntity) => entity.state,
    } as never,
  });
  new ContextProvider(host, {
    context: apiContext,
    initialValue: { callService } as never,
  });
  new ContextProvider(host, {
    context: connectionContext,
    initialValue: { hassUrl: (path: string) => path } as never,
  });
  new ContextProvider(host, {
    context: statesContext,
    initialValue: states,
  });

  const element = document.createElement("more-info-media_player");
  element.stateObj = stateObj;
  host.append(element);
  document.body.append(host);
  hosts.push(host);
  await element.updateComplete;

  const memberRows = () =>
    [...element.shadowRoot!.querySelectorAll(".group-member")].map((row) => ({
      name: row.querySelector(".group-member-name")!.textContent,
      volume: row.querySelector("ha-media-player-volume")!,
    }));

  const memberSection = () =>
    element.shadowRoot!.querySelector(".group-members");

  return { memberRows, memberSection, callService };
};

const memberMuteButton = async (volume: HaMediaPlayerVolume) => {
  await volume.updateComplete;
  return volume.shadowRoot!.querySelector<HTMLElement>("ha-icon-button")!;
};

describe("more-info-media_player group members", () => {
  beforeAll(() => {
    // jsdom's ElementInternals lacks the validity API used by the webawesome
    // form-associated elements.
    const internalsProto = window.ElementInternals.prototype as any;
    internalsProto.setValidity = vi.fn();
    internalsProto.setFormValue = vi.fn();
    Object.defineProperty(internalsProto, "validity", {
      get: () => ({ valid: true }),
      configurable: true,
    });
  });

  afterEach(() => {
    hosts.forEach((host) => host.remove());
    hosts = [];
  });

  it("shows no member controls for an ungrouped player", async () => {
    const living = player("media_player.living", {
      group_members: ["media_player.living"],
    });
    const { memberSection } = await mount(living, {
      "media_player.living": living,
    });

    expect(memberSection()).toBeNull();
  });

  it("shows a row for each member except the opened player", async () => {
    const living = player("media_player.living", {
      group_members: ["media_player.living", "media_player.kitchen"],
    });
    const kitchen = player("media_player.kitchen");
    const { memberRows } = await mount(living, {
      "media_player.living": living,
      "media_player.kitchen": kitchen,
    });

    expect(memberRows().map(({ name }) => name)).toEqual([
      "media_player.kitchen",
    ]);
  });

  it("hides the section when no other member has a state", async () => {
    const living = player("media_player.living", {
      group_members: ["media_player.living", "media_player.gone"],
    });
    const { memberSection } = await mount(living, {
      "media_player.living": living,
    });

    expect(memberSection()).toBeNull();
  });

  it("targets the member, not the opened player", async () => {
    const living = player("media_player.living", {
      group_members: ["media_player.living", "media_player.kitchen"],
    });
    const kitchen = player("media_player.kitchen", { is_volume_muted: true });
    const { memberRows, callService } = await mount(living, {
      "media_player.living": living,
      "media_player.kitchen": kitchen,
    });

    (await memberMuteButton(memberRows()[0].volume)).click();

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "volume_mute",
      { entity_id: "media_player.kitchen", is_volume_muted: false }
    );
  });
});
