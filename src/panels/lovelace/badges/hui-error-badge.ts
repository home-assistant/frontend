import { mdiAlertCircle } from "@mdi/js";
import { dump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-badge";
import "../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../types";
import { showAlertDialog } from "../custom-card-helpers";
import { LovelaceBadge } from "../types";
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
      <ha-badge
        class="error"
        @click=${this._viewDetail}
        type="button"
        label="Error"
      >
        <ha-svg-icon slot="icon" .path=${mdiAlertCircle}></ha-svg-icon>
        <div class="content">${this._config.error}</div>
      </ha-badge>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-badge {
        --badge-color: var(--error-color);
        --ha-card-border-color: var(--error-color);
      }
      .content {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-badge": HuiErrorBadge;
  }
}
