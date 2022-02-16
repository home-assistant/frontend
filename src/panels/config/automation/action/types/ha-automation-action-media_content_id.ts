import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-service-control";
import { PlayMediaAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-media_content_id")
export class HaPlayMediaAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: PlayMediaAction;

  @property({ type: Boolean }) public narrow = false;

  public static get defaultConfig() {
    return { entity_id: "", media_content_id: "", media_content_type: "" };
  }

  protected render() {
    return html`
      <ha-selector-media
        .hass=${this.hass}
        .value=${this.action}
      ></ha-selector-media>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-media_content_id": HaPlayMediaAction;
  }
}
