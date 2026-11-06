import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../components/entity/state-info";
import { haStyle } from "../resources/styles";
import { consume } from "../common/decorators/consume";
import { formattersContext } from "../data/context";
import type { HomeAssistantFormatters } from "../types";

@customElement("state-card-event")
class StateCardEvent extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: HomeAssistantFormatters;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render() {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="container">
          <div class="event_type">
            ${this._formatters?.formatEntityState(this.stateObj)}
          </div>
          <div class="event_data">
            ${this._formatters?.formatEntityAttributeValue(
              this.stateObj,
              "event_type"
            )}
          </div>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .event_data {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-event": StateCardEvent;
  }
}
