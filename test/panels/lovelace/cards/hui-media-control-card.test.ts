import { ContextProvider } from "@lit/context";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  apiContext,
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../../../src/data/context";
import "../../../../src/panels/lovelace/cards/hui-media-control-card";
import type { HuiMediaControlCard } from "../../../../src/panels/lovelace/cards/hui-media-control-card";
import type { MediaControlCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type {
  HomeAssistantApi,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../../src/types";
import { mockStateObj } from "../../../common/entity/context/context-mock";

const ENTITY = "media_player.test";

let host: HTMLElement | undefined;

const mount = async (callService: HomeAssistantApi["callService"]) => {
  host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      locale: { language: "en" },
      localize: (key: string) => key,
    } as unknown as HomeAssistantInternationalization,
  });
  new ContextProvider(host, {
    context: formattersContext,
    initialValue: {
      formatEntityName: () => "Test",
      formatEntityState: () => "Playing",
    } as unknown as HomeAssistantFormatters,
  });
  new ContextProvider(host, {
    context: apiContext,
    initialValue: { callService } as unknown as HomeAssistantApi,
  });
  new ContextProvider(host, {
    context: statesContext,
    initialValue: {
      [ENTITY]: mockStateObj({
        entity_id: ENTITY,
        state: "paused",
        attributes: {
          media_duration: 300,
          media_position: 42,
          // PAUSE | SEEK | PLAY
          supported_features: 16387,
        },
      }),
    },
  });

  const card = document.createElement(
    "hui-media-control-card"
  ) as HuiMediaControlCard;
  card.setConfig({
    type: "media-control",
    entity: ENTITY,
  } as MediaControlCardConfig);
  host.appendChild(card);
  document.body.appendChild(host);
  await card.updateComplete;
  return card;
};

describe("hui-media-control-card", () => {
  // jsdom lacks the validity API of form controls
  const internalsProto = window.ElementInternals.prototype as any;
  const patched = ["setValidity", "setFormValue", "validity"];
  const originals = patched.map((key) =>
    Object.getOwnPropertyDescriptor(internalsProto, key)
  );

  beforeAll(() => {
    internalsProto.setValidity = vi.fn();
    internalsProto.setFormValue = vi.fn();
    Object.defineProperty(internalsProto, "validity", {
      get: () => ({ valid: true }),
      configurable: true,
    });
  });

  afterAll(() => {
    patched.forEach((key, i) => {
      if (originals[i]) {
        Object.defineProperty(internalsProto, key, originals[i]);
      } else {
        delete internalsProto[key];
      }
    });
  });

  beforeEach(() => {
    // jsdom has no layout, and a card narrower than 350px hides the slider.
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();

        disconnect = vi.fn();
      }
    );
  });

  afterEach(() => {
    host?.remove();
    host = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // A touch drag ends without a click, so seeking must follow the slider's
  // change event.
  it("seeks when the slider reports a change", async () => {
    const callService = vi.fn();
    const card = await mount(callService);
    const slider = card.shadowRoot!.querySelector("ha-slider")!;
    expect(slider).not.toBeNull();

    slider.value = 120;
    slider.dispatchEvent(new Event("change", { bubbles: true }));

    expect(callService).toHaveBeenCalledWith("media_player", "media_seek", {
      entity_id: ENTITY,
      seek_position: 120,
    });
  });
});
