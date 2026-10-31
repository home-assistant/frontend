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
// In the group, but not a player the dialog lists
const UNLISTED = "media_player.unlisted";

const stateFor = (entity_id: string, group_members?: string[]) => ({
  entity_id,
  state: "playing",
  attributes: {
    supported_features: MediaPlayerEntityFeature.GROUPING,
    group_members,
  },
});

const statesWithMembers = (members: string[]) =>
  ({
    [ENTITY_ID]: stateFor(ENTITY_ID, members),
    [KITCHEN]: stateFor(KITCHEN, members),
    [BEDROOM]: stateFor(BEDROOM),
    [OFFICE]: stateFor(OFFICE),
  }) as never;

let hosts: HTMLElement[] = [];

const mount = async (
  callService = vi.fn().mockResolvedValue({}),
  members = [ENTITY_ID, KITCHEN]
) => {
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
  const states = new ContextProvider(host, {
    context: statesContext,
    initialValue: statesWithMembers(members),
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
  };

  const setMembers = async (newMembers: string[]) => {
    states.setValue(statesWithMembers(newMembers));
    await dialog.updateComplete;
  };

  return { dialog, row, flip, settle, setMembers, callService };
};

describe("dialog-join-media-players", () => {
  afterEach(() => {
    hosts.forEach((host) => host.remove());
    hosts = [];
  });

  // Sonos, HEOS, and MusicCast drop members that aren't sent when the target
  // isn't the group leader.
  it("sends every member when joining a speaker", async () => {
    const { flip, settle, callService } = await mount();

    await flip(BEDROOM, true);
    await settle();

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "join",
      { group_members: [KITCHEN, BEDROOM] },
      { entity_id: ENTITY_ID }
    );
  });

  it("unjoins the speaker that was switched off", async () => {
    const { flip, settle, callService } = await mount();

    await flip(KITCHEN, false);
    await settle();

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "unjoin",
      {},
      { entity_id: KITCHEN }
    );
  });

  it("keeps members the dialog doesn't list when selecting all", async () => {
    const { dialog, settle, callService } = await mount(undefined, [
      ENTITY_ID,
      KITCHEN,
      UNLISTED,
    ]);

    dialog
      .shadowRoot!.querySelector<HTMLElement>('[slot="actionItems"]')!
      .click();
    await dialog.updateComplete;
    await settle();

    expect(callService).toHaveBeenCalledExactlyOnceWith(
      "media_player",
      "join",
      { group_members: [KITCHEN, UNLISTED, BEDROOM, OFFICE] },
      { entity_id: ENTITY_ID }
    );
  });

  it("follows group changes made while it is open", async () => {
    const { row, setMembers } = await mount();

    await setMembers([ENTITY_ID, BEDROOM]);

    expect(row(KITCHEN).checked).toBe(false);
    expect(row(KITCHEN).showVolume).toBe(false);
    expect(row(BEDROOM).checked).toBe(true);
    expect(row(BEDROOM).showVolume).toBe(true);
  });

  it("restores the real members and shows the error on failure", async () => {
    const callService = vi.fn().mockRejectedValue(new Error("Offline"));
    const { dialog, flip, settle, row } = await mount(callService);

    await flip(BEDROOM, true);
    await settle();

    expect(row(BEDROOM).checked).toBe(false);
    expect(row(KITCHEN).checked).toBe(true);
    expect(dialog.shadowRoot!.querySelector("ha-alert")?.textContent).toContain(
      "Offline"
    );
  });

  it("blocks changes until a call from a closed dialog finishes", async () => {
    let finish!: () => void;
    const callService = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const { dialog, flip, settle, row } = await mount(callService as never);

    await flip(BEDROOM, true);
    dialog
      .shadowRoot!.querySelector("ha-dialog")!
      .dispatchEvent(new Event("closed"));
    await dialog.updateComplete;
    dialog.showDialog({ entityId: ENTITY_ID });
    await dialog.updateComplete;

    expect(row(BEDROOM).disabled).toBe(true);
    finish();
    await settle();
    expect(row(KITCHEN).checked).toBe(true);
  });
});
