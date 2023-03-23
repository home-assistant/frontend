import { HassEntity } from "home-assistant-js-websocket/dist/types";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { getNumberFormatOptions } from "../../../common/number/format_number";
import "../../../components/ha-card";
import "../../../components/ha-gauge";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { GaugeCardConfig } from "./types";

export const DEFAULT_MIN = 0;
export const DEFAULT_MAX = 100;

export const severityMap = {
  red: "var(--error-color)",
  green: "var(--success-color)",
  yellow: "var(--warning-color)",
  normal: "var(--info-color)",
};

@customElement("hui-gauge-card")
class HuiGaugeCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-gauge-card-editor");
    return document.createElement("hui-gauge-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GaugeCardConfig {
    const includeDomains = ["counter", "input_number", "number", "sensor"];
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isNaN(Number(stateObj.state));

    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return { type: "gauge", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: GaugeCardConfig;

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: GaugeCardConfig): void {
    if (!config.entity) {
      throw new Error("Entity must be specified");
    }
    if (!isValidEntityId(config.entity)) {
      throw new Error("Invalid entity");
    }

    this._config = { min: DEFAULT_MIN, max: DEFAULT_MAX, ...config };
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const entityState = Number(stateObj.state);

    if (stateObj.state === UNAVAILABLE) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_unavailable",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    if (isNaN(entityState)) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_non_numeric",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    const name = this._config.name ?? computeStateName(stateObj);

    // Use `stateObj.state` as value to keep formatting (e.g trailing zeros)
    // for consistent value display across gauge, entity, entity-row, etc.
    return html`
      <ha-card @click=${this._handleClick} tabindex="0">
        <ha-gauge
          .min=${this._config.min!}
          .max=${this._config.max!}
          .value=${stateObj.state}
          .formatOptions=${getNumberFormatOptions(
            stateObj,
            this.hass.entities[stateObj.entity_id]
          )}
          .locale=${this.hass!.locale}
          .label=${this._config!.unit ||
          this.hass?.states[this._config!.entity].attributes
            .unit_of_measurement ||
          ""}
          style=${styleMap({
            "--gauge-color": this._computeSeverity(entityState),
          })}
          .needle=${this._config!.needle}
          .levels=${this._config!.needle ? this._severityLevels() : undefined}
        ></ha-gauge>
        <div class="name" .title=${name}>${name}</div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | GaugeCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private _computeSeverity(numberValue: number): string | undefined {
    if (this._config!.needle) {
      return undefined;
    }

    // new format
    let segments = this._config!.segments;
    if (segments) {
      segments = [...segments].sort((a, b) => a.from - b.from);

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (
          segment &&
          numberValue >= segment.from &&
          (i + 1 === segments.length || numberValue < segments[i + 1]?.from)
        ) {
          return segment.color;
        }
      }
      return severityMap.normal;
    }

    // old format
    const sections = this._config!.severity;

    if (!sections) {
      return severityMap.normal;
    }

    const sectionsArray = Object.keys(sections);
    const sortable = sectionsArray.map((severity) => [
      severity,
      sections[severity],
    ]);

    for (const severity of sortable) {
      if (severityMap[severity[0]] == null || isNaN(severity[1])) {
        return severityMap.normal;
      }
    }
    sortable.sort((a, b) => a[1] - b[1]);

    if (numberValue >= sortable[0][1] && numberValue < sortable[1][1]) {
      return severityMap[sortable[0][0]];
    }
    if (numberValue >= sortable[1][1] && numberValue < sortable[2][1]) {
      return severityMap[sortable[1][0]];
    }
    if (numberValue >= sortable[2][1]) {
      return severityMap[sortable[2][0]];
    }
    return severityMap.normal;
  }

  private _severityLevels() {
    // new format
    const segments = this._config!.segments;
    if (segments) {
      return segments.map((segment) => ({
        level: segment?.from,
        stroke: segment?.color,
        label: segment?.label,
      }));
    }

    // old format
    const sections = this._config!.severity;

    if (!sections) {
      return [{ level: 0, stroke: severityMap.normal }];
    }

    const sectionsArray = Object.keys(sections);
    return sectionsArray.map((severity) => ({
      level: sections[severity],
      stroke: severityMap[severity],
    }));
  }

  private _handleClick(): void {
    fireEvent(this, "hass-more-info", { entityId: this._config!.entity });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        cursor: pointer;
        height: 100%;
        overflow: hidden;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        box-sizing: border-box;
      }

      ha-card:focus {
        outline: none;
      }

      ha-gauge {
        width: 100%;
        max-width: 250px;
      }

      .name {
        text-align: center;
        line-height: initial;
        color: var(--primary-text-color);
        width: 100%;
        font-size: 15px;
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card": HuiGaugeCard;
  }
}
