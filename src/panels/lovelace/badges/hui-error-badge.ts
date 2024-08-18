import { mdiAlertCircle } from "@mdi/js";
import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-label-badge";
import "../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../types";
import { showAlertDialog } from "../custom-card-helpers";
import { LovelaceBadge } from "../types";
import { HuiEntityBadge } from "./hui-entity-badge";
import { ErrorBadgeConfig } from "./types";

export const createErrorBadgeElement = (config) => {
  const el = document.createElement("hui-error-badge");
  el.setConfig(config);
  return el;
};

export const createErrorBadgeConfig = (error) => ({
  type: "error",
  error,
});

@customElement("hui-error-badge")
export class HuiErrorBadge extends LitElement implements LovelaceBadge {
  public hass?: HomeAssistant;

  @state() private _config?: ErrorBadgeConfig;

  public setConfig(config: ErrorBadgeConfig): void {
    this._config = config;
  }

  private _viewDetail() {
    let dumped: string | undefined;

    if (this._config!.origConfig) {
      try {
        dumped = dump(this._config!.origConfig);
      } catch (err: any) {
        dumped = `[Error dumping ${this._config!.origConfig}]`;
      }
    }

    showAlertDialog(this, {
      title: this._config?.error,
      warning: true,
      text: dumped ? html`<pre>${dumped}</pre>` : "",
    });
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <button class="badge error" @click=${this._viewDetail}>
        <ha-svg-icon .hass=${this.hass} .path=${mdiAlertCircle}></ha-svg-icon>
        <ha-ripple></ha-ripple>
        <span class="content">
          <span class="name">Error</span>
          <span class="state">${this._config.error}</span>
        </span>
      </button>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      HuiEntityBadge.styles,
      css`
        .badge.error {
          --badge-color: var(--error-color);
          border-color: var(--badge-color);
        }
        ha-svg-icon {
          color: var(--badge-color);
        }
        .state {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        pre {
          font-family: var(--code-font-family, monospace);
          white-space: break-spaces;
          user-select: text;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-badge": HuiErrorBadge;
  }
}
