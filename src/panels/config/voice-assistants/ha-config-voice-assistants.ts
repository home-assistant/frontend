import { mdiDevices, mdiMicrophone } from "@mdi/js";
import { customElement, property } from "lit/decorators";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";
import { CloudStatus } from "../../../data/cloud";

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

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

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
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
    pageEl.cloudStatus = this.cloudStatus;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.route = this.routeTail;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-voice-assistants": HaConfigVoiceAssistants;
  }
}
