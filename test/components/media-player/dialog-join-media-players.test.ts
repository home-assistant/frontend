import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiContext,
  entitiesContext,
  internationalizationContext,
  statesContext,
} from "../../../src/data/context";
import { MediaPlayerEntityFeature } from "../../../src/data/media-player";
import "../../../src/components/media-player/dialog-join-media-players";

// The dialog's own logic is under test, not the elements it renders.
vi.mock("../../../src/components/ha-alert", () => ({}));
vi.mock("../../../src/components/ha-button", () => ({}));
vi.mock("../../../src/components/ha-dialog", () => ({}));
vi.mock("../../../src/components/ha-dialog-footer", () => ({}));
vi.mock("../../../src/components/ha-dialog-header", () => ({}));
vi.mock(
  "../../../src/components/media-player/ha-media-player-toggle",
  () => ({})
);

const ENTITY_ID = "media_player.living";
const KITCHEN = "media_player.kitchen";
const BEDROOM = "media_player.bedroom";
const OFFICE = "media_player.office";

let hosts: HTMLElement[] = [];

const mount = async (callService = vi.fn().mockResolvedValue({})) => {
  const stateFor = (entity_id: string, group_members?: string[]) => ({
    entity_id,
    state: "playing",
    attributes: {
      supported_features: MediaPlayerEntityFeature.GROUPING,
      group_members,
    },
  });
  const ids = [ENTITY_ID, KITCHEN, BEDROOM, OFFICE];

  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: { localize: (key: string) => key } as never,
  });
  new ContextProvider(host, {
    context: apiContext,
    initialValue: { callService } as never,
  });
  new ContextProvider(host, {
    context: entitiesContext,
    initialValue: Object.fromEntries(
      ids.map((entity_id) => [entity_id, { entity_id, platform: "demo" }])
    ) as never,
  });
  new ContextProvider(host, {
    context: statesContext,
    initialValue: {
      [ENTITY_ID]: stateFor(ENTITY_ID, [ENTITY_ID, KITCHEN]),
      [KITCHEN]: stateFor(KITCHEN, [ENTITY_ID, KITCHEN]),
      [BEDROOM]: stateFor(BEDROOM),
      [OFFICE]: stateFor(OFFICE),
    } as never,
  });

  const dialog = document.createElement("dialog-join-media-players");
  host.append(dialog);
  document.body.append(host);
  hosts.push(host);
  await dialog.updateComplete;
  dialog.showDialog({ entityId: ENTITY_ID });
  await dialog.updateComplete;

  const row = (entityId: string) =>
    [...dialog.shadowRoot!.querySelectorAll("ha-media-player-toggle")].find(
      (toggle) => toggle.entityId === entityId
    )!;

  const settle = async () => {
    await vi.waitFor(() => expect(row(BEDROOM).disabled).toBe(false));
    await dialog.updateComplete;
  };

  const flip = async (entityId: string, checked: boolean) => {
    const toggle = row(entityId);
    toggle.checked = checked;
    toggle.dispatchEvent(new Event("change"));
    await dialog.updateComplete;
    await settle();
  };

  return { dialog, row, flip, settle, callService };
};

describe("dialog-join-media-players", () => {
  afterEach(() => {
    hosts.forEach((host) => host.remove());
    hosts = [];
  });

  it("joins only the speaker that was switched on", async () => {
    const { flip, row, callService } = await mount();

    await flip(BEDROOM, true);

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "join",
      { group_members: [BEDROOM] },
      { entity_id: ENTITY_ID }
    );
    expect(row(BEDROOM).showVolume).toBe(true);
  });

  it("unjoins the speaker that was switched off", async () => {
    const { flip, row, callService } = await mount();

    await flip(KITCHEN, false);

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "unjoin",
      {},
      { entity_id: KITCHEN }
    );
    expect(row(KITCHEN).showVolume).toBe(false);
  });

  it("selects all without rejoining current members", async () => {
    const { dialog, settle, callService } = await mount();

    dialog
      .shadowRoot!.querySelector<HTMLElement>('[slot="actionItems"]')!
      .click();
    await dialog.updateComplete;
    await settle();

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "join",
      { group_members: [BEDROOM, OFFICE] },
      { entity_id: ENTITY_ID }
    );
  });

  it("reverts the switch and shows the error when a call fails", async () => {
    const callService = vi.fn().mockRejectedValue(new Error("Offline"));
    const { dialog, flip, row } = await mount(callService);

    await flip(BEDROOM, true);

    expect(row(BEDROOM).checked).toBe(false);
    expect(row(BEDROOM).showVolume).toBe(false);
    expect(dialog.shadowRoot!.querySelector("ha-alert")?.textContent).toContain(
      "Offline"
    );
  });
});
