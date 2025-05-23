import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import "../components/ha-cover-controls";
import "../components/ha-cover-tilt-controls";
import type { CoverEntity } from "../data/cover";
import { isTiltOnly } from "../data/cover";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-cover")
class StateCardCover extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <ha-cover-controls
          .hass=${this.hass}
          .hidden=${isTiltOnly(this.stateObj)}
          .stateObj=${this.stateObj}
        ></ha-cover-controls>
        <ha-cover-tilt-controls
          .hass=${this.hass}
          .hidden=${!isTiltOnly(this.stateObj)}
          .stateObj=${this.stateObj}
        ></ha-cover-tilt-controls>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          line-height: var(--ha-line-height-normal);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-cover": StateCardCover;
  }
}
