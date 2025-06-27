import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { generateEntityFilter } from "../../../common/entity/entity_filter";
import {
  computeGroupEntitiesState,
  toggleGroupEntities,
} from "../../../common/entity/group_entities";
import { stateActive } from "../../../common/entity/state_active";
import { domainColorProperties } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import { forwardHaptic } from "../../../data/haptics";
import { computeCssVariable } from "../../../resources/css-variables";
import type { HomeAssistant } from "../../../types";
import type { AreaCardFeatureContext } from "../cards/hui-area-card";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  AreaControl,
  AreaControlsCardFeatureConfig,
  LovelaceCardFeatureContext,
  LovelaceCardFeaturePosition,
} from "./types";
import { AREA_CONTROLS } from "./types";

interface AreaControlsButton {
  offIcon?: string;
  onIcon?: string;
  filter: {
    domain: string;
    device_class?: string;
  };
}

const coverButton = (deviceClass: string) => ({
  filter: {
    domain: "cover",
    device_class: deviceClass,
  },
});

export const AREA_CONTROLS_BUTTONS: Record<AreaControl, AreaControlsButton> = {
  light: {
    // Overrides the icons for lights
    offIcon: "mdi:lightbulb-off",
    onIcon: "mdi:lightbulb",
    filter: {
      domain: "light",
    },
  },
  fan: {
    filter: {
      domain: "fan",
    },
  },
  switch: {
    filter: {
      domain: "switch",
    },
  },
  "cover-blind": coverButton("blind"),
  "cover-curtain": coverButton("curtain"),
  "cover-damper": coverButton("damper"),
  "cover-awning": coverButton("awning"),
  "cover-door": coverButton("door"),
  "cover-garage": coverButton("garage"),
  "cover-gate": coverButton("gate"),
  "cover-shade": coverButton("shade"),
  "cover-shutter": coverButton("shutter"),
  "cover-window": coverButton("window"),
};

export const supportsAreaControlsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const area = context.area_id ? hass.areas[context.area_id] : undefined;
  return !!area;
};

export const getAreaControlEntities = (
  controls: AreaControl[],
  areaId: string,
  excludeEntities: string[] | undefined,
  hass: HomeAssistant
): Record<AreaControl, string[]> =>
  controls.reduce(
    (acc, control) => {
      const controlButton = AREA_CONTROLS_BUTTONS[control];
      const filter = generateEntityFilter(hass, {
        area: areaId,
        entity_category: "none",
        ...controlButton.filter,
      });

      acc[control] = Object.keys(hass.entities).filter(
        (entityId) => filter(entityId) && !excludeEntities?.includes(entityId)
      );
      return acc;
    },
    {} as Record<AreaControl, string[]>
  );

export const MAX_DEFAULT_AREA_CONTROLS = 4;

@customElement("hui-area-controls-card-feature")
class HuiAreaControlsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: AreaCardFeatureContext;

  @property({ attribute: false })
  public position?: LovelaceCardFeaturePosition;

  @state() private _config?: AreaControlsCardFeatureConfig;

  private get _area() {
    if (!this.hass || !this.context || !this.context.area_id) {
      return undefined;
    }
    return this.hass.areas[this.context.area_id!] as
      | AreaRegistryEntry
      | undefined;
  }

  private get _controls() {
    return (
      this._config?.controls || (AREA_CONTROLS as unknown as AreaControl[])
    );
  }

  static getStubConfig(): AreaControlsCardFeatureConfig {
    return {
      type: "area-controls",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-area-controls-card-feature-editor"
    );
    return document.createElement("hui-area-controls-card-feature-editor");
  }

  public setConfig(config: AreaControlsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _handleButtonTap(ev: MouseEvent) {
    ev.stopPropagation();

    if (!this.context?.area_id || !this.hass || !this._config) {
      return;
    }
    const control = (ev.currentTarget as any).control as AreaControl;

    const controlEntities = this._controlEntities(
      this._controls,
      this.context.area_id,
      this.context.exclude_entities,
      this.hass!.entities,
      this.hass!.devices,
      this.hass!.areas
    );
    const entitiesIds = controlEntities[control];

    const entities = entitiesIds
      .map((entityId) => this.hass!.states[entityId] as HassEntity | undefined)
      .filter((v): v is HassEntity => Boolean(v));

    forwardHaptic("light");
    toggleGroupEntities(this.hass, entities);
  }

  private _controlEntities = memoizeOne(
    (
      controls: AreaControl[],
      areaId: string,
      excludeEntities: string[] | undefined,
      // needed to update memoized function when entities, devices or areas change
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ) => getAreaControlEntities(controls, areaId, excludeEntities, this.hass!)
  );

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._area ||
      !supportsAreaControlsCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const controlEntities = this._controlEntities(
      this._controls,
      this.context.area_id!,
      this.context.exclude_entities,
      this.hass!.entities,
      this.hass!.devices,
      this.hass!.areas
    );

    const supportedControls = this._controls.filter(
      (control) => controlEntities[control].length > 0
    );

    const displayControls = this._config.controls
      ? supportedControls
      : supportedControls.slice(0, MAX_DEFAULT_AREA_CONTROLS); // Limit to max if using default controls

    if (!displayControls.length) {
      return nothing;
    }

    return html`
      <ha-control-button-group ?no-stretch=${this.position === "inline"}>
        ${displayControls.map((control) => {
          const button = AREA_CONTROLS_BUTTONS[control];

          const entityIds = controlEntities[control];

          const entities = entityIds
            .map(
              (entityId) =>
                this.hass!.states[entityId] as HassEntity | undefined
            )
            .filter((v): v is HassEntity => Boolean(v));

          const groupState = computeGroupEntitiesState(entities);

          const active = entities[0]
            ? stateActive(entities[0], groupState)
            : false;

          const label = this.hass!.localize(
            `ui.card_features.area_controls.${control}.${active ? "off" : "on"}`
          );

          const icon = active ? button.onIcon : button.offIcon;

          const domain = button.filter.domain;
          const deviceClass = button.filter.device_class
            ? ensureArray(button.filter.device_class)[0]
            : undefined;

          const activeColor = computeCssVariable(
            domainColorProperties(domain, deviceClass, groupState, true)
          );

          return html`
            <ha-control-button
              style=${styleMap({
                "--active-color": activeColor,
              })}
              .title=${label}
              aria-label=${label}
              class=${active ? "active" : ""}
              .control=${control}
              @click=${this._handleButtonTap}
            >
              <ha-domain-icon
                .hass=${this.hass}
                .icon=${icon}
                .domain=${domain}
                .deviceClass=${deviceClass}
                .state=${groupState}
              ></ha-domain-icon>
            </ha-control-button>
          `;
        })}
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-button-group {
          --control-button-group-alignment: flex-end;
        }
        ha-control-button {
          --active-color: var(--state-active-color);
          --control-button-focus-color: var(--state-active-color);
        }
        ha-control-button.active {
          --control-button-background-color: var(--active-color);
          --control-button-icon-color: var(--active-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-controls-card-feature": HuiAreaControlsCardFeature;
  }
}
