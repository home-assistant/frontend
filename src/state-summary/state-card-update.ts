import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../components/entity/state-info";
import type { UpdateEntity } from "../data/update";
import { computeUpdateStateDisplay } from "../data/update";
import { haStyle } from "../resources/styles";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import {
  formattersContext,
  internationalizationContext,
} from "../data/context";
import type {
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../types";

@customElement("state-card-update")
export class StateCardUpdate extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityState"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityState,
  })
  private _formatEntityState?: HomeAssistantFormatters["formatEntityState"];

  @property({ attribute: false }) public stateObj!: UpdateEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info .stateObj=${this.stateObj} .inDialog=${this.inDialog}>
        </state-info>
        <div class="state">
          ${
            this._i18n && this._formatEntityState
              ? computeUpdateStateDisplay(
                  this.stateObj,
                  this._i18n.localize,
                  this._i18n.locale,
                  this._formatEntityState
                )
              : nothing
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
