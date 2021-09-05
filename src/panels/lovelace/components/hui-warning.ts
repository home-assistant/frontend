import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import { html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../components/ha-alert";
import { HomeAssistant } from "../../../types";

export const createEntityNotFoundWarning = (
  hass: HomeAssistant,
  entityId: string
) =>
  hass.config.state !== STATE_NOT_RUNNING
    ? hass.localize(
        "ui.panel.lovelace.warning.entity_not_found",
        "entity",
        entityId || "[empty]"
      )
    : hass.localize("ui.panel.lovelace.warning.starting");

@customElement("hui-warning")
export class HuiWarning extends LitElement {
  protected render(): TemplateResult {
    return html`<ha-alert alert-type="warning"><slot></slot></ha-alert> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning": HuiWarning;
  }
}
