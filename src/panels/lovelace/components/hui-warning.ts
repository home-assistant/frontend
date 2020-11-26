import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";

export const createEntityNotFoundWarning = (
  hass: HomeAssistant,
  entityId: string
) => {
  return hass.config.state !== STATE_NOT_RUNNING
    ? hass.localize(
        "ui.panel.lovelace.warning.entity_not_found",
        "entity",
        entityId || "[empty]"
      )
    : hass.localize("ui.panel.lovelace.warning.starting");
};

@customElement("hui-warning")
export class HuiWarning extends LitElement {
  protected render(): TemplateResult {
    return html` <slot></slot> `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        color: black;
        background-color: #fce588;
        padding: 8px;
        word-break: break-word;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-warning": HuiWarning;
  }
}
