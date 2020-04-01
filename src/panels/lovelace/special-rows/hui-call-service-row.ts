import { customElement } from "lit-element";

import { ButtonRowConfig } from "../entity-rows/types";
import { HuiButtonRow } from "./hui-button-row";

@customElement("hui-call-service-row")
export class HuiCallServiceRow extends HuiButtonRow {
  public setConfig(config: ButtonRowConfig): void {
    const callServiceConfig: any = config;

    if (!callServiceConfig) {
      throw new Error("Error in card configuration.");
    }

    if (!callServiceConfig.name) {
      throw new Error("Error in card configuration. No name specified.");
    }

    if (!callServiceConfig.service) {
      throw new Error("Error in card configuration. No service specified.");
    }

    this._config = {
      tap_action: {
        action: "call-service",
        service: callServiceConfig.service,
        service_data: callServiceConfig.service_data,
      },
      ...callServiceConfig,
      type: "button",
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-call-service-row": HuiCallServiceRow;
  }
}
