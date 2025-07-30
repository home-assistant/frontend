import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-button";

@customElement("more-info-counter")
class MoreInfoCounter extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    const disabled = isUnavailableState(this.stateObj.state);

    return html`
      <div class="actions">
        <ha-button
          appearance="plain"
          size="small"
          .action=${"increment"}
          @click=${this._handleActionClick}
          .disabled=${disabled ||
          Number(this.stateObj.state) === this.stateObj.attributes.maximum}
        >
          ${this.hass!.localize("ui.card.counter.actions.increment")}
        </ha-button>
        <ha-button
          appearance="plain"
          size="small"
          .action=${"decrement"}
          @click=${this._handleActionClick}
          .disabled=${disabled ||
          Number(this.stateObj.state) === this.stateObj.attributes.minimum}
        >
          ${this.hass!.localize("ui.card.counter.actions.decrement")}
        </ha-button>
        <ha-button
          appearance="plain"
          size="small"
          .action=${"reset"}
          @click=${this._handleActionClick}
          .disabled=${disabled}
        >
          ${this.hass!.localize("ui.card.counter.actions.reset")}
        </ha-button>
      </div>
    `;
  }

  private _handleActionClick(e: MouseEvent): void {
    const action = (e.currentTarget as any).action;
    this.hass.callService("counter", action, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static styles = css`
    .actions {
      margin: 8px 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-counter": MoreInfoCounter;
  }
}
