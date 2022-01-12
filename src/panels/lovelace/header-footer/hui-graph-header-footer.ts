import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-circular-progress";
import { fetchRecent } from "../../../data/history";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { coordinates } from "../common/graph/coordinates";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-graph-base";
import { LovelaceHeaderFooter, LovelaceHeaderFooterEditor } from "../types";
import { GraphHeaderFooterConfig } from "./types";

const MINUTE = 60000;
const HOUR = MINUTE * 60;
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

  private _date?: Date;

  private _stateHistory?: HassEntity[];

  private _fetching = false;

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

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
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
      const inHoursToShow: HassEntity[] = [];
      const outHoursToShow: HassEntity[] = [];
      // Split into inside and outside of "hours to show".
      this._stateHistory!.forEach((entity) =>
        (endTime.getTime() - new Date(entity.last_changed).getTime() <=
        this._config!.hours_to_show! * HOUR
          ? inHoursToShow
          : outHoursToShow
        ).push(entity)
      );

      if (outHoursToShow.length) {
        // If we have values that are now outside of "hours to show", re-add the last entry. This could e.g. be
        // the "initial state" from the history backend. Without it, it would look like there is no history data
        // at the start at all in the database = graph would start suddenly instead of on the left side of the card.
        inHoursToShow.push(outHoursToShow[outHoursToShow.length - 1]);
      }
      this._stateHistory = inHoursToShow;
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
        this._config!.detail!,
        this._config!.limits
      ) || [];

    this._date = endTime;
    this._fetching = false;
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
