import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, SectionConfig } from "../entity-rows/types";

@customElement("hui-section-row")
class HuiSectionRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @state() private _config?: SectionConfig;

  public setConfig(config: SectionConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <div class="divider"></div>
      ${this._config.label
        ? html`
            <div class="label" .title=${this._config.label}>
              ${this._config.label}
            </div>
          `
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .label {
        color: var(--section-header-text-color, var(--primary-text-color));
        margin-left: 8px;
        margin-bottom: 8px;
        margin-top: 16px;
        font-weight: 500;
      }
      .divider {
        height: 1px;
        background-color: var(--entities-divider-color, var(--divider-color));
        margin-left: -16px;
        margin-right: -16px;
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-row": HuiSectionRow;
  }
}
