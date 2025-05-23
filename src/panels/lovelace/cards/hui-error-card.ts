import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import { mdiAlertCircleOutline, mdiAlertOutline } from "@mdi/js";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { ErrorCardConfig } from "./types";
import "../../../components/ha-card";

const ERROR_ICONS = {
  warning: mdiAlertOutline,
  error: mdiAlertCircleOutline,
};

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public preview = false;

  @property({ attribute: "severity" }) public severity: "warning" | "error" =
    "error";

  @state() private _config?: ErrorCardConfig;

  public getCardSize(): number {
    return 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 1,
      min_rows: 1,
      min_columns: 6,
    };
  }

  public setConfig(config: ErrorCardConfig): void {
    this._config = config;
    this.severity = config.severity || "error";
  }

  protected render() {
    const error =
      this._config?.error ||
      this.hass?.localize("ui.errors.config.configuration_error");
    const showTitle = this.hass === undefined || this.hass?.user?.is_admin;

    return html`
      <ha-card class="${this.severity} ${showTitle ? "" : "no-title"}">
        <div class="icon">
          <slot name="icon">
            <ha-svg-icon .path=${ERROR_ICONS[this.severity]}></ha-svg-icon>
          </slot>
        </div>
        ${showTitle
          ? html`<div class="title"><slot>${error}</slot></div>`
          : nothing}
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
      border-width: 0;
      display: flex;
      align-items: center;
      column-gap: var(--ha-card-column-gap, 16px);
      padding: 16px;
    }
    ha-card::after {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      opacity: 0.12;
      pointer-events: none;
      content: "";
      border-radius: var(--ha-card-border-radius, 12px);
    }
    .no-title {
      justify-content: center;
    }
    .title {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-weight: var(--ha-font-weight-bold);
    }
    ha-card.warning > .icon {
      color: var(--warning-color);
    }
    ha-card.warning::after {
      background-color: var(--warning-color);
    }
    ha-card.error > .icon {
      color: var(--error-color);
    }
    ha-card.error::after {
      background-color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}
