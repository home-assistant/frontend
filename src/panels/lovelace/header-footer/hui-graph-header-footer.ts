import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { getHistoryCoordinates } from "../common/graph/get-history-coordinates";

import "@polymer/paper-spinner/paper-spinner";
import "../components/hui-graph-base";
import { LovelaceHeaderFooter } from "../types";
import { GraphHeaderFooterConfig } from "./types";

const MINUTE = 60000;

@customElement("hui-graph-header-footer")
export class HuiGraphHeaderFooter extends LitElement
  implements LovelaceHeaderFooter {
  public static getStubConfig(): object {
    return {};
  }

  @property() public hass?: HomeAssistant;

  @property() protected _config?: GraphHeaderFooterConfig;

  @property() private _coordinates?: number[][];

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
        <div class="container">
          <paper-spinner active></paper-spinner>
        </div>
      `;
    }

    if (this._coordinates.length < 1) {
      return html`
        <div class="container">
          <div class="info">
            No state history found.
          </div>
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
      paper-spinner {
        position: absolute;
        top: calc(50% - 28px);
        left: calc(50% - 14px);
      }
      .container {
        position: relative;
        padding-bottom: 20%;
      }
      .info {
        position: absolute;
        width: 100%;
        top: calc(50% - 16px);
        color: var(--secondary-text-color);
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-header-footer": HuiGraphHeaderFooter;
  }
}
