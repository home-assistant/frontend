import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-circular-progress";
import { subscribeHistoryStatesTimeWindow } from "../../../data/history";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { coordinatesMinimalResponseCompressedState } from "../common/graph/coordinates";
import "../components/hui-graph-base";
import { LovelaceHeaderFooter, LovelaceHeaderFooterEditor } from "../types";
import { GraphHeaderFooterConfig } from "./types";

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const includeDomains = ["counter", "input_number", "number", "sensor"];

@customElement("hui-graph-header-footer")
export class HuiGraphHeaderFooter
  extends LitElement
  implements LovelaceHeaderFooter
{
  public static async getConfigElement(): Promise<LovelaceHeaderFooterEditor> {
    await import("../editor/config-elements/hui-graph-footer-editor");
    return document.createElement("hui-graph-footer-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GraphHeaderFooterConfig {
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isNaN(Number(stateObj.state)) &&
      !!stateObj.attributes.unit_of_measurement;

    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return {
      type: "graph",
      entity: foundEntities[0] || "",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public type!: "header" | "footer";

  @property() protected _config?: GraphHeaderFooterConfig;

  @state() private _coordinates?: number[][];

  private _error?: string;

  private _interval?: number;

  private _subscribed?: Promise<(() => Promise<void>) | void>;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: GraphHeaderFooterConfig): void {
    if (
      !config?.entity ||
      !includeDomains.includes(computeDomain(config.entity))
    ) {
      throw new Error("Specify an entity from within the sensor domain");
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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    if (this._error) {
      return html`<div class="errors">${this._error}</div>`;
    }

    if (!this._coordinates) {
      return html`
        <div class="container">
          <ha-circular-progress active size="small"></ha-circular-progress>
        </div>
      `;
    }

    if (!this._coordinates.length) {
      return html`
        <div class="container">
          <div class="info">No state history found.</div>
        </div>
      `;
    }

    return html`
      <hui-graph-base .coordinates=${this._coordinates}></hui-graph-base>
    `;
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this._config) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _subscribeHistory() {
    if (
      !isComponentLoaded(this.hass!, "history") ||
      this._subscribed ||
      !this._config
    ) {
      return;
    }
    this._subscribed = subscribeHistoryStatesTimeWindow(
      this.hass!,
      (combinedHistory) => {
        if (!this._subscribed || !this._config) {
          // Message came in before we had a chance to unload
          return;
        }
        this._coordinates =
          coordinatesMinimalResponseCompressedState(
            combinedHistory[this._config.entity],
            this._config.hours_to_show!,
            500,
            this._config.detail!,
            this._config.limits
          ) || [];
      },
      this._config.hours_to_show!,
      [this._config.entity]
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
    });
    this._setRedrawTimer();
  }

  private _redrawGraph() {
    if (this._coordinates) {
      this._coordinates = [...this._coordinates];
    }
  }

  private _setRedrawTimer() {
    // redraw the graph every minute to update the time axis
    clearInterval(this._interval);
    this._interval = window.setInterval(
      () => this._redrawGraph(),
      this._config!.hours_to_show! > 24 ? HOUR : MINUTE
    );
  }

  private _unsubscribeHistory() {
    clearInterval(this._interval);
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (!this._config || !this.hass || !changedProps.has("_config")) {
      return;
    }

    const oldConfig = changedProps.get("_config") as GraphHeaderFooterConfig;
    if (
      !oldConfig ||
      !this._subscribed ||
      oldConfig.entity !== this._config.entity
    ) {
      this._unsubscribeHistory();
      this._subscribeHistory();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-circular-progress {
        position: absolute;
        top: calc(50% - 14px);
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
