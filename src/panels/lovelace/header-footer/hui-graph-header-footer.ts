import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  PropertyValues,
} from "lit-element";

import "../components/hui-graph-base";

import { LovelaceHeaderFooter } from "../types";
import { HomeAssistant } from "../../../types";
import { GraphHeaderFooterConfig } from "./types";
import { fetchRecent } from "../../../data/history";
import { coordinates } from "../common/graph/coordinates";

const minute = 60000;

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

    const stateObj = this.hass!.states[this._config.entity];

    if (!stateObj.attributes.unit_of_measurement) {
      return html`
        <hui-warning
          >Entity: ${this._config.entity} - Has no Unit of Measurement and
          therefore can not display a line graph.</hui-warning
        >
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
    } else if (Date.now() - this._date!.getTime() >= minute) {
      this._getCoordinates();
    }
  }

  private async _getCoordinates(): Promise<void> {
    const endTime = new Date();
    const startTime = new Date();
    startTime.setHours(endTime.getHours() - this._config!.hours_to_show!);

    const stateHistory = await fetchRecent(
      this.hass,
      this._config!.entity,
      startTime,
      endTime
    );

    if (stateHistory.length < 1 || stateHistory[0].length < 1) {
      return;
    }

    const coords = coordinates(
      stateHistory[0],
      this._config!.hours_to_show!,
      500,
      this._config!.detail!
    );

    this._coordinates = coords;
    this._date = new Date();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-header-footer": HuiGraphHeaderFooter;
  }
}
