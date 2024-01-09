import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../../components/ha-icon";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, WeblinkConfig } from "../entity-rows/types";

@customElement("hui-weblink-row")
class HuiWeblinkRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @state() private _config?: WeblinkConfig;

  public setConfig(config: WeblinkConfig): void {
    if (!config || !config.url) {
      throw new Error("URL required");
    }

    this._config = {
      icon: "hass:link",
      name: config.url,
      ...config,
    };
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`
      <a
        href=${this._config.url}
        target=${ifDefined(this._computeTargetValue())}
        rel="noreferrer"
        ?download=${this._config.download}
      >
        <ha-icon .icon=${this._config.icon}></ha-icon>
        <div .title=${this._config.name}>${this._config.name}</div>
      </a>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        display: flex;
        align-items: center;
        color: var(--primary-color);
      }
      ha-icon {
        padding: 8px;
        color: var(--paper-item-icon-color);
      }
      div {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-left: 16px;
      }
    `;
  }

  protected _computeTargetValue(): string | undefined {
    return this._config &&
      (this._config.url.indexOf("://") !== -1 ||
        this._config.new_tab === true ||
        this._config.download === true)
      ? "_blank"
      : undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weblink-row": HuiWeblinkRow;
  }
}
