import { customElement, property } from "lit/decorators";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { HomeAssistant } from "../../../types";

@customElement("ha-config-voice-assistants")
class HaConfigVoiceAssistants extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "debug",
    routes: {
      debug: {
        tag: "assist-pipeline-debug",
        load: () =>
          import(
            "../integrations/integration-panels/voice_assistant/assist/assist-pipeline-debug"
          ),
      },
    },
  };

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;
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
