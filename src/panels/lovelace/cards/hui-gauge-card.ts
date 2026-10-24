import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityRegistryEntry,
  consumeEntityState,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { valueFromParts } from "../../../common/entity/value_parts";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-gauge";
import {
  configContext,
  formattersContext,
  internationalizationContext,
  uiContext,
} from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryDisplayEntry } from "../../../data/entity/entity_registry";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
  HomeAssistantUI,
} from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { hasAction, hasAnyAction } from "../common/has-action";
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

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: GaugeCardConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["_config", "entity"] })
  _entity?: EntityRegistryDisplayEntry;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

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
    if (!this._config) {
      return nothing;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this._i18n.localize, this._hassConfig)}
        </hui-warning>
      `;
    }

    if (stateObj.state === UNAVAILABLE) {
      return html`
        <hui-warning
          >${this._i18n.localize(
            "ui.panel.lovelace.warning.entity_unavailable",
            { entity: this._config.entity }
          )}</hui-warning
        >
      `;
    }

    let parts;
    if (this._config.attribute) {
      parts = this._formatters.formatEntityAttributeValueToParts(
        stateObj,
        this._config.attribute
      );
    } else {
      parts = this._formatters.formatEntityStateToParts(stateObj);
    }
    const customUnit = this._config.unit;
    // Custom unit can't keep a locale position, so append it at the end;
    // otherwise render natively.
    const valueToDisplay = customUnit
      ? valueFromParts(parts)
      : parts.map((part) => part.value).join("");
    const value = this._config.attribute
      ? stateObj.attributes[this._config.attribute]
      : stateObj.state;

    if (isNaN(value)) {
      return html`
        <hui-warning
          >${this._i18n.localize(
            this._config.attribute
              ? "ui.panel.lovelace.warning.attribute_not_numeric"
              : "ui.panel.lovelace.warning.entity_non_numeric",
            { entity: this._config.entity, attribute: this._config.attribute }
          )}</hui-warning
        >
      `;
    }

    const name = this._formatters.formatEntityName(stateObj, this._config.name);

    // In a sections view with a set number of rows the card height is fixed,
    // so the gauge also has to fit in the height, not only in the width.
    const rows = this._config.grid_options?.rows;
    const fixedHeight =
      this.layout === "grid" && rows !== undefined && rows !== "auto";

    return html`
      <ha-card
        class=${classMap({
          action: hasAnyAction(this._config),
          "fixed-height": fixedHeight,
        })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config.hold_action),
          hasDoubleClick: hasAction(this._config.double_tap_action),
        })}
        tabindex=${ifDefined(
          !this._config.tap_action || hasAction(this._config.tap_action)
            ? "0"
            : undefined
        )}
      >
        <ha-gauge
          .min=${this._config.min!}
          .max=${this._config.max!}
          .value=${value}
          .valueText=${valueToDisplay}
          .locale=${this._i18n.locale}
          .label=${customUnit ?? ""}
          style=${styleMap({
            "--gauge-color": this._computeSeverity(Number(value)),
          })}
          .needle=${this._config!.needle}
          .levels=${this._config!.needle ? this._severityLevels() : undefined}
        ></ha-gauge>
        <p class="title" .title=${name}>${name}</p>
      </ha-card>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._themes) {
      return;
    }

    const oldThemes = changedProps.get("_themes") as Themes | undefined;
    const oldConfig = changedProps.get("_config") as
      GaugeCardConfig | undefined;

    if (
      !oldThemes ||
      !oldConfig ||
      oldThemes !== this._themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
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

  private _handleAction(ev: ActionHandlerEvent) {
    fireEvent(this, "hass-action", {
      config: this._config!,
      action: ev.detail.action,
    });
  }

  static styles = css`
    ha-card {
      height: 100%;
      overflow: hidden;
      padding: var(--ha-space-3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      box-sizing: border-box;
    }

    ha-card.action {
      cursor: pointer;
    }

    ha-card:focus {
      outline: none;
    }

    .title {
      width: 100%;
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-expanded);
      margin: 0;
      text-align: center;
      box-sizing: border-box;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: none;
      color: var(--primary-text-color);
    }

    ha-gauge {
      width: 100%;
      max-width: 250px;
    }

    ha-card.fixed-height {
      container-type: size;
    }

    /* The gauge is 100 by 55 (see the viewBox in ha-gauge), so limit its
       width to what fits in the card height left over after the name. */
    ha-card.fixed-height ha-gauge {
      flex: none;
      max-width: min(
        250px,
        calc(
          (100cqh - var(--ha-font-size-m) * var(--ha-line-height-expanded)) *
            100 / 55
        )
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-gauge-card": HuiGaugeCard;
  }
}
