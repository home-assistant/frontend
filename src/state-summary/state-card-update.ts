import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import { computeUpdateStateDisplay, UpdateEntity } from "../data/update";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";

@customElement("state-card-update")
export class StateCardUpdate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: UpdateEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        >
        </state-info>
        <div class="state">
          ${computeUpdateStateDisplay(this.stateObj, this.hass)}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        state-info {
          flex: 0 1 fit-content;
          min-width: 120px;
        }
        .state {
          color: var(--primary-text-color);
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end, right);
          min-width: 50px;
          flex: 0 1 fit-content;
          word-break: break-word;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-update": StateCardUpdate;
  }
}
