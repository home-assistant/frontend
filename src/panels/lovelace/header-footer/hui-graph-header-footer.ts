import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  PropertyValues,
  CSSResult,
  css,
} from "lit-element";

import "../components/hui-graph-base";

import { LovelaceHeaderFooter } from "../types";
import { HomeAssistant } from "../../../types";
import { GraphHeaderFooterConfig } from "./types";
import { getHistoryCoordinates } from "../common/graph/get-history-coordinates";

const MINUTE = 60000;

@customElement("hui-graph-header-footer")
export class HuiGraphHeaderFooter extends LitElement
  implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return {};
  }

  @property() public hass?: HomeAssistant;
  @property() protected _config?: GraphHeaderFooterConfig;
  @property() private _coordinates?: any;
  private _date?: Date;

  public setConfig(config: GraphHeaderFooterConfig): void {
    if (!config?.entity || config.entity.split(".")[0] !== "sensor") {
      throw new Error(
        "Invalid Configuration: An entity from within the sensor domain required"
      );
    }

    const cardConfig = {
      detail: 1,
      hours_to_show: 24,
      ...config,
    };

    cardConfig.hours_to_show = Number(cardConfig.hours_to_show);
    cardConfig.detail =
      cardConfig.detail === 1 || cardConfig.detail === 2
        ? cardConfig.detail
        : 1;

    this._config = cardConfig;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    if (!this._coordinates) {
      return html`
        <div class="info">
          No state history found.
        </div>
      `;
    }

    return html`
      <hui-graph-base .coordinates=${this._coordinates}></hui-graph-base>
    `;
  }

  protected firstUpdated(): void {
    this._date = new Date();
  }

  protected updated(changedProps: PropertyValues) {
    if (!this._config || !this.hass) {
      return;
    }

    if (changedProps.has("_config")) {
      this._getCoordinates();
    } else if (Date.now() - this._date!.getTime() >= MINUTE) {
      this._getCoordinates();
    }
  }

  private async _getCoordinates(): Promise<void> {
    this._coordinates = await getHistoryCoordinates(
      this.hass!,
      this._config!.entity,
      this._config!.hours_to_show!,
      this._config!.detail!
    );

    this._date = new Date();
  }

  static get styles(): CSSResult {
    return css`
      .info {
        text-align: center;
        line-height: 58px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-header-footer": HuiGraphHeaderFooter;
  }
}
