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

export const createErrorCard = (
  hass: HomeAssistant,
  message?: string,
  severity?: "warning" | "error"
) => {
  const el = document.createElement("hui-error-card");
  el.setConfig({
    type: "error",
    error: message,
    severity: severity,
  });
  el.hass = hass;
  return el;
};

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public preview = false;

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
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    const error =
      this._config.error ||
      this.hass?.localize("ui.errors.config.configuration_error");
    const title = this.hass?.user?.is_admin ? error : "";
    const severity = this._config.severity || "error";

    return html`
      <ha-card class="${severity} ${title ? "" : "no-title"}">
        <div class="icon">
          <slot name="icon">
            <ha-svg-icon .path=${ERROR_ICONS[severity]}></ha-svg-icon>
          </slot>
        </div>
        ${title ? html`<div class="title">${title}</div>` : nothing}
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
