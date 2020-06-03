import "@polymer/paper-spinner/paper-spinner";
import { HassEntity } from "home-assistant-js-websocket";
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
import { fetchRecent } from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { coordinates } from "../common/graph/coordinates";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-graph-base";
import { LovelaceHeaderFooter } from "../types";
import { GraphHeaderFooterConfig } from "./types";

const MINUTE = 60000;
const DAY = 86400000;

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

  private _stateHistory?: HassEntity[];

  private _fetching = false;

  public getCardSize(): number {
    return 2;
  }

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

    if (!this._coordinates.length) {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues) {
    if (
      !this._config ||
      !this.hass ||
      (this._fetching && !changedProps.has("_config"))
    ) {
      return;
    }

    if (changedProps.has("_config")) {
      const oldConfig = changedProps.get("_config") as GraphHeaderFooterConfig;
      if (!oldConfig || oldConfig.entity !== this._config.entity) {
        this._stateHistory = [];
      }

      this._getCoordinates();
    } else if (Date.now() - this._date!.getTime() >= MINUTE) {
      this._getCoordinates();
    }
  }

  private async _getCoordinates(): Promise<void> {
    this._fetching = true;
    const endTime = new Date();
    const startTime =
      !this._date || !this._stateHistory?.length
        ? new Date(
            new Date().setHours(
              endTime.getHours() - this._config!.hours_to_show!
            )
          )
        : this._date;

    if (this._stateHistory!.length) {
      this._stateHistory = this._stateHistory!.filter(
        (entity) =>
          endTime.getTime() - new Date(entity.last_changed).getTime() <= DAY
      );
    }

    const stateHistory = await fetchRecent(
      this.hass!,
      this._config!.entity,
      startTime,
      endTime,
      Boolean(this._stateHistory!.length)
    );

    if (stateHistory.length && stateHistory[0].length) {
      this._stateHistory!.push(...stateHistory[0]);
    }

    this._coordinates =
      coordinates(
        this._stateHistory,
        this._config!.hours_to_show!,
        500,
        this._config!.detail!
      ) || [];

    this._date = endTime;
    this._fetching = false;
  }

  static get styles(): CSSResult {
    return css`
      paper-spinner {
        position: absolute;
        top: calc(50% - 28px);
      }
      .container {
        display: flex;
        justify-content: center;
        position: relative;
        padding-bottom: 20%;
      }
      .info {
        position: absolute;
        top: calc(50% - 16px);
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
