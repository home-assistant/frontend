import { safeDump } from "js-yaml";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { ErrorCardConfig } from "./types";

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;

  @state() private _config?: ErrorCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: ErrorCardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    let dumped: string | undefined;

    if (this._config.origConfig) {
      try {
        dumped = safeDump(this._config.origConfig);
      } catch (err) {
        dumped = `[Error dumping ${this._config.origConfig}]`;
      }
    }

    return html`
      ${this._config.error}${dumped ? html`<pre>${dumped}</pre>` : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        background-color: var(--error-color);
        color: var(--color-on-error, white);
        padding: 8px;
        font-weight: 500;
        user-select: text;
        cursor: default;
      }
      pre {
        font-family: var(--code-font-family, monospace);
        text-overflow: ellipsis;
        overflow: hidden;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": HuiErrorCard;
  }
}
