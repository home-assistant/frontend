import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { computeDomain } from "../common/entity/compute_domain";
import "../components/entity/state-info";
import "../components/ha-action-result";
import type { HaActionResult } from "../components/ha-action-result";
import "../components/ha-control-button";
import { UNAVAILABLE } from "../data/entity/entity";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-button")
export class StateCardButton extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  @query("ha-action-result") private _result!: HaActionResult;

  protected render() {
    const stateObj = this.stateObj;
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <ha-control-button
          .disabled=${stateObj.state === UNAVAILABLE}
          @click=${this._pressButton}
        >
          <ha-action-result>
            ${this.hass.localize("ui.card.button.press")}
          </ha-action-result>
        </ha-control-button>
      </div>
    `;
  }

  private _pressButton(ev: Event) {
    ev.stopPropagation();
    if (this._result.busy) return;

    this._result.run(
      this.hass.callService(computeDomain(this.stateObj.entity_id), "press", {
        entity_id: this.stateObj.entity_id,
      })
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-control-button {
          width: auto;
          min-width: 40px;
          --control-button-padding: 0 var(--ha-space-4);
          --control-button-focus-color: var(--primary-text-color);
          --control-button-icon-color: var(--feature-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-button": StateCardButton;
  }
}
