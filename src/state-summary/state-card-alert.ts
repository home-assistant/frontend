import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stateActive } from "../common/entity/state_active";
import "../components/entity/ha-entity-toggle";
import "../components/entity/state-info";
import { haStyle } from "../resources/styles";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import { formattersContext } from "../data/context";
import type { HomeAssistantFormatters } from "../types";

@customElement("state-card-alert")
class StateCardAlert extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityState"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityState,
  })
  private _formatEntityState?: HomeAssistantFormatters["formatEntityState"];

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info .stateObj=${this.stateObj} .inDialog=${this.inDialog}>
        </state-info>
        <div class="state">
          ${
            stateActive(this.stateObj)
              ? html`<ha-entity-toggle
                  .stateObj=${this.stateObj}
                ></ha-entity-toggle>`
              : this._formatEntityState?.(this.stateObj)
          }
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        state-info {
          flex: 1 1 auto;
          min-width: 0;
        }
        .state {
          color: var(--primary-text-color);
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end, right);
          flex: 0 0 auto;
          overflow-wrap: break-word;
          display: flex;
          align-items: center;
        }
        ha-entity-toggle {
          margin: -4px -16px -4px 0;
          margin-inline-start: 0;
          margin-inline-end: -16px;
          padding: 4px 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-alert": StateCardAlert;
  }
}
