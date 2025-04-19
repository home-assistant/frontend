import { mdiAlertCircle } from "@mdi/js";
import { dump } from "js-yaml";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-badge";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { showAlertDialog } from "../custom-card-helpers";
import type { LovelaceBadge } from "../types";
import type { ErrorBadgeConfig } from "./types";

export const createErrorHeadingBadgeElement = (config) => {
  const el = document.createElement("hui-error-heading-badge");
  el.setConfig(config);
  return el;
};

export const createErrorHeadingBadgeConfig = (error) => ({
  type: "error",
  error,
});

@customElement("hui-error-heading-badge")
export class HuiErrorHeadingBadge extends LitElement implements LovelaceBadge {
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
      } catch (_err: any) {
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
      <ha-heading-badge
        class="error"
        @click=${this._viewDetail}
        type="button"
        .title=${this._config.error}
      >
        <ha-svg-icon slot="icon" .path=${mdiAlertCircle}></ha-svg-icon>
        <span class="content">${this._config.error}</span>
      </ha-heading-badge>
    `;
  }

  static styles = css`
    ha-heading-badge {
      --icon-color: var(--error-color);
      color: var(--error-color);
    }
    .content {
      max-width: 70px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    pre {
      font-family: var(--ha-font-family-code);
      white-space: break-spaces;
      user-select: text;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-heading-badge": HuiErrorHeadingBadge;
  }
}
