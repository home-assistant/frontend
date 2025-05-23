import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../components/ha-icon";
import type { LovelaceRow, TextConfig } from "../entity-rows/types";

@customElement("hui-text-row")
class HuiTextRow extends LitElement implements LovelaceRow {
  @state() private _config?: TextConfig;

  public setConfig(config: TextConfig): void {
    if (!config || !config.name || !config.text) {
      throw new Error("Name and text required");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <ha-icon .icon=${this._config.icon}></ha-icon>
      <div class="name" .title=${this._config.name}>${this._config.name}</div>
      <div class="text" .title=${this._config.text}>${this._config.text}</div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
    }
    ha-icon {
      padding: 8px;
      color: var(--state-icon-color);
    }
    div {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .name {
      margin-left: 16px;
      margin-inline-start: 16px;
      margin-inline-end: initial;
    }
    .text {
      text-align: var(--float-end);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-text-row": HuiTextRow;
  }
}
