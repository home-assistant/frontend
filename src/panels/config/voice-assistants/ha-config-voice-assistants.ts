import { consume } from "@lit/context";
import { mdiDevices, mdiMicrophone } from "@mdi/js";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { CloudStatus } from "../../../data/cloud";
import { entitiesContext } from "../../../data/context";
import type { ExposeEntitySettings } from "../../../data/expose";
import { listExposedEntities } from "../../../data/expose";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../types";

export const voiceAssistantTabs = [
  {
    path: "/config/voice-assistants/assistants",
    translationKey: "ui.panel.config.voice_assistants.assistants.caption",
    iconPath: mdiMicrophone,
  },
  {
    path: "/config/voice-assistants/expose",
    translationKey: "ui.panel.config.voice_assistants.expose.caption",
    iconPath: mdiDevices,
  },
];

@customElement("ha-config-voice-assistants")
class HaConfigVoiceAssistants extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  _entities!: HomeAssistant["entities"];

  @state() private _exposedEntities?: Record<string, ExposeEntitySettings>;

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "exposed-entities-changed",
      this._fetchExposedEntities
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "exposed-entities-changed",
      this._fetchExposedEntities
    );
  }

  protected routerOptions: RouterOptions = {
    defaultPage: "assistants",
    routes: {
      assistants: {
        tag: "ha-config-voice-assistants-assistants",
        load: () => import("./ha-config-voice-assistants-assistants"),
        cache: true,
      },
      expose: {
        tag: "ha-config-voice-assistants-expose",
        load: () => import("./ha-config-voice-assistants-expose"),
      },
      debug: {
        tag: "assist-debug",
        load: () => import("./debug/assist-debug"),
      },
      assist: {
        tag: "ha-config-voice-assistants-assist-devices",
        load: () =>
          import("./assist/ha-config-voice-assistants-assist-devices"),
      },
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
    pageEl.cloudStatus = this.cloudStatus;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
    pageEl.exposedEntities = this._exposedEntities;
  }

  public willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("_entities")) {
      this._fetchExposedEntities();
    }
  }

  private _fetchExposedEntities = async () => {
    this._exposedEntities = (
      await listExposedEntities(this.hass)
    ).exposed_entities;
    if (this.lastChild) {
      (this.lastChild as any).exposedEntities = this._exposedEntities;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-voice-assistants": HaConfigVoiceAssistants;
  }
  interface HASSDomEvents {
    "exposed-entities-changed": undefined;
  }
}
