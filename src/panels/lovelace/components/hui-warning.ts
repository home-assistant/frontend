import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import "../../../components/ha-alert";
import type { HomeAssistant } from "../../../types";
import "../cards/hui-error-card";

export const createEntityNotFoundWarning = (
  hass: Pick<HomeAssistant, "config" | "localize">,
  // left for backwards compatibility for custom cards
  _entityId: string
) =>
  hass.config.state !== STATE_NOT_RUNNING
    ? hass.localize("ui.card.common.entity_not_found")
    : hass.localize("ui.panel.lovelace.warning.starting");

@customElement("hui-warning")
export class HuiWarning extends LitElement {
  protected render(): TemplateResult {
    return html`<hui-error-card severity="warning"
      ><slot></slot
    ></hui-error-card>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning": HuiWarning;
  }
}
