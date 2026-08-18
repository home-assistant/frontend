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

  @query("ha-action-result") private _result?: HaActionResult;

  private _pressing = false;

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
          ${this.hass.localize("ui.card.button.press")}
          <ha-action-result></ha-action-result>
        </ha-control-button>
      </div>
    `;
  }

  private async _pressButton(ev: Event) {
    ev.stopPropagation();
    if (this._pressing) return;

    this._pressing = true;
    try {
      await this.hass.callService(
        computeDomain(this.stateObj.entity_id),
        "press",
        { entity_id: this.stateObj.entity_id }
      );
      this._result?.success();
    } catch (_err) {
      this._result?.error();
    } finally {
      this._pressing = false;
    }
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
