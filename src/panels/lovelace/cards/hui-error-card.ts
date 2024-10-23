import { dump } from "js-yaml";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-alert";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard } from "../types";
import type { ErrorCardConfig } from "./types";

@customElement("hui-error-card")
export class HuiErrorCard extends LitElement implements LovelaceCard {
  public hass?: HomeAssistant;

  @property({ attribute: false }) public preview = false;

  @state() private _config?: ErrorCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: ErrorCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    let dumped: string | undefined;

    if (this._config.origConfig) {
      try {
        dumped = dump(this._config.origConfig);
      } catch (err: any) {
        dumped = `[Error dumping ${this._config.origConfig}]`;
      }
    }

    return html`<ha-alert alert-type="error" .title=${this._config.error}>
      ${dumped ? html`<pre>${dumped}</pre>` : ""}
    </ha-alert>`;
  }

  static get styles(): CSSResultGroup {
    return css`
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
    "hui-error-card": HuiErrorCard;
  }
}
