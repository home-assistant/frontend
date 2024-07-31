import { customElement } from "lit/decorators";
import { CallServiceConfig } from "../entity-rows/types";
import { HuiButtonRow } from "./hui-button-row";

@customElement("hui-call-service-row")
export class HuiCallServiceRow extends HuiButtonRow {
  public setConfig(config: any): void {
    const callServiceConfig: CallServiceConfig = config;

    if (!callServiceConfig) {
      throw new Error("Invalid configuration");
    }

    if (!callServiceConfig.name) {
      throw new Error("No name specified");
    }

    if (!callServiceConfig.action && !callServiceConfig.service) {
      throw new Error("No action specified");
    }

    super.setConfig({
      tap_action: {
        action: "perform-action",
        perform_action: (callServiceConfig.action ||
          callServiceConfig.service)!,
        data: callServiceConfig.data || callServiceConfig.service_data,
      },
      ...callServiceConfig,
      type: "button",
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-call-service-row": HuiCallServiceRow;
  }
}
