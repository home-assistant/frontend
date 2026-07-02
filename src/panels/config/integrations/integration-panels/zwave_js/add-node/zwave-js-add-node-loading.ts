import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";

import { blankBeforePercent } from "../../../../../../common/translations/blank_before_percent";
import "../../../../../../components/animation/ha-fade-in";
import "../../../../../../components/ha-spinner";
import "../../../../../../components/progress/ha-progress-ring";
import { WakeLockMixin } from "../../../../../../mixins/wakelock-mixin";
import type { HomeAssistant } from "../../../../../../types";

@customElement("zwave-js-add-node-loading")
export class ZWaveJsAddNodeLoading extends WakeLockMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public description?: string;

  @property({ type: Number }) public progress?: number;

  @property({ type: Number }) public delay = 0;

  render() {
    return html`
      <ha-fade-in .delay=${this.delay}>
        <div class="loading">
          ${
            this.progress !== undefined
              ? html`
                  <ha-progress-ring size="large" .value=${this.progress}>
                    ${Math.round(this.progress)}${blankBeforePercent(
                      this.hass.locale
                    )}%
                  </ha-progress-ring>
                `
              : html`<ha-spinner size="large"></ha-spinner>`
          }
        </div>
        ${this.description ? html`<p>${this.description}</p>` : nothing}
      </ha-fade-in>
    `;
  }

  static styles = css`
    ha-fade-in {
      display: block;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }
    p {
      margin-top: 16px;
      color: var(--secondary-text-color);
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-loading": ZWaveJsAddNodeLoading;
  }
}
