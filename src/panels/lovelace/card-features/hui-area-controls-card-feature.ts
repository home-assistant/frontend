import { mdiFan, mdiLightbulb, mdiToggleSwitch } from "@mdi/js";
import { callService, type HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import {
  generateEntityFilter,
  type EntityFilter,
} from "../../../common/entity/entity_filter";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  AreaControl,
  AreaControlsCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import { AREA_CONTROLS } from "./types";

interface AreaControlsButton {
  iconPath: string;
  onService: string;
  offService: string;
  domain: string;
  filter: EntityFilter;
}

export const AREA_CONTROLS_BUTTONS: Record<AreaControl, AreaControlsButton> = {
  light: {
    iconPath: mdiLightbulb,
    filter: {
      domain: "light",
    },
    domain: "light",
    onService: "light.turn_on",
    offService: "light.turn_off",
  },
  fan: {
    iconPath: mdiFan,
    filter: {
      domain: "fan",
    },
    domain: "fan",
    onService: "fan.turn_on",
    offService: "fan.turn_off",
  },
  switch: {
    iconPath: mdiToggleSwitch,
    filter: {
      domain: "switch",
    },
    domain: "switch",
    onService: "switch.turn_on",
    offService: "switch.turn_off",
  },
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
  hass: HomeAssistant
): Record<AreaControl, string[]> =>
  controls.reduce(
    (acc, control) => {
      const controlButton = AREA_CONTROLS_BUTTONS[control];
      const filter = generateEntityFilter(hass, {
        area: areaId,
        domain: "light",
        ...controlButton.filter,
      });

      acc[control] = Object.keys(hass.entities).filter((entityId) =>
        filter(entityId)
      );
      return acc;
    },
    {} as Record<AreaControl, string[]>
  );

@customElement("hui-area-controls-card-feature")
class HuiAreaControlsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

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

    if (!this.context?.area_id || !this.hass) {
      return;
    }
    const control = (ev.currentTarget as any).control as AreaControl;

    const controlEntities = this._controlEntities(
      this._controls,
      this.context.area_id,
      this.hass!.entities,
      this.hass!.devices,
      this.hass!.areas
    );
    const entitiesIds = controlEntities[control];

    const { onService, offService } = AREA_CONTROLS_BUTTONS[control];

    const isOn = entitiesIds.some((entityId) =>
      stateActive(this.hass!.states[entityId] as HassEntity)
    );

    const [domain, service] = (isOn ? offService : onService).split(".");

    callService(this.hass!.connection, domain, service, {
      entity_id: entitiesIds,
    });
  }

  private _controlEntities = memoizeOne(
    (
      controls: AreaControl[],
      areaId: string,
      // needed to update memoized function when entities, devices or areas change
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ) => getAreaControlEntities(controls, areaId, this.hass!)
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

    const controls = this._config.controls || AREA_CONTROLS;

    const controlEntities = this._controlEntities(
      this._controls,
      this.context.area_id!,
      this.hass!.entities,
      this.hass!.devices,
      this.hass!.areas
    );

    const supportedControls = controls.filter(
      (control) => controlEntities[control].length > 0
    );

    return html`
      <ha-control-button-group>
        ${supportedControls.map((control) => {
          const button = AREA_CONTROLS_BUTTONS[control];

          const entities = controlEntities[control];
          const active = entities.some((entityId) => {
            const stateObj = this.hass!.states[entityId] as
              | HassEntity
              | undefined;
            if (!stateObj) {
              return false;
            }
            return stateActive(stateObj);
          });

          const color = `var(--state-${button.domain}-active-color)`;

          return html`
            <ha-control-button
              class=${active ? "active" : ""}
              style=${styleMap({ "--active-color": color })}
              .control=${control}
              @click=${this._handleButtonTap}
            >
              <ha-svg-icon .path=${button.iconPath}></ha-svg-icon>
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
        ha-control-button {
          --active-color: var(--primary-color);
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
