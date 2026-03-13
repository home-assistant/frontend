import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  computeGroupEntitiesState,
  toggleGroupEntities,
} from "../../../common/entity/group_entities";
import { stateActive } from "../../../common/entity/state_active";
import { domainColorProperties } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-domain-icon";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area/area_registry";
import {
  AREA_CONTROLS_BUTTONS,
  getAreaControlEntities,
  MAX_DEFAULT_AREA_CONTROLS,
} from "../../../data/area/area_controls";
import { forwardHaptic } from "../../../data/haptics";
import { computeCssVariable } from "../../../resources/css-variables";
import type { HomeAssistant } from "../../../types";
import type { AreaCardFeatureContext } from "../cards/hui-area-card";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import {
  AREA_CONTROL_DOMAINS,
  type AreaControl,
  type AreaControlDomain,
  type AreaControlsCardFeatureConfig,
  type LovelaceCardFeatureContext,
  type LovelaceCardFeaturePosition,
} from "./types";

type NormalizedControl =
  | { type: "domain"; value: AreaControlDomain }
  | { type: "entity"; value: string };

interface ControlButtonElement extends HTMLElement {
  control: NormalizedControl;
}

export const supportsAreaControlsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const area = context.area_id ? hass.areas[context.area_id] : undefined;
  return !!area;
};

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

  private get _controls(): AreaControl[] {
    return this._config?.controls || [...AREA_CONTROL_DOMAINS];
  }

  private _normalizeControl(control: AreaControl): NormalizedControl {
    // Handle explicit entity format
    if (typeof control === "object" && "entity_id" in control) {
      return { type: "entity", value: control.entity_id };
    }

    // String format: domain control (if valid) or invalid
    if (AREA_CONTROL_DOMAINS.includes(control as AreaControlDomain)) {
      return { type: "domain", value: control as AreaControlDomain };
    }

    // Invalid domain string - treat as entity
    return { type: "entity", value: control };
  }

  static getStubConfig(): AreaControlsCardFeatureConfig {
    return {
      type: "area-controls",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-area-controls-card-feature-editor");
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

    if (!this.hass || !this._config) {
      return;
    }

    const normalized = (ev.currentTarget as ControlButtonElement).control;

    if (normalized.type === "entity") {
      const entity = this.hass.states[normalized.value];
      if (entity) {
        forwardHaptic(this, "light");
        toggleGroupEntities(this.hass, [entity]);
      }
      return;
    }

    if (!this.context?.area_id) {
      return;
    }

    const domainControls = this._domainControls(this._controls);

    const controlEntities = this._controlEntities(
      domainControls,
      this.context.area_id,
      this.context.exclude_entities,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );

    const entities = controlEntities[normalized.value]
      .map((entityId) => this.hass!.states[entityId] as HassEntity | undefined)
      .filter((v): v is HassEntity => Boolean(v));

    forwardHaptic(this, "light");
    toggleGroupEntities(this.hass, entities);
  }

  private _domainControls = memoizeOne((controls: AreaControl[]) =>
    controls
      .map((c) => this._normalizeControl(c))
      .filter(
        (n): n is { type: "domain"; value: AreaControlDomain } =>
          n.type === "domain"
      )
      .map((n) => n.value)
  );

  private _controlEntities = memoizeOne(
    (
      controls: AreaControlDomain[],
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

    const normalizedControls = this._controls.map((c) =>
      this._normalizeControl(c)
    );

    // Get domain controls for entity lookup
    const domainControls = this._domainControls(this._controls);

    const controlEntities = this._controlEntities(
      domainControls,
      this.context.area_id!,
      this.context.exclude_entities,
      this.hass!.entities,
      this.hass!.devices,
      this.hass!.areas
    );

    // Filter controls while preserving original order
    const allControls = normalizedControls.filter((n) =>
      n.type === "domain"
        ? controlEntities[n.value].length > 0
        : this.hass!.states[n.value] &&
          !this.context?.exclude_entities?.includes(n.value)
    );

    const displayControls = this._config.controls
      ? allControls
      : allControls.slice(0, MAX_DEFAULT_AREA_CONTROLS); // Limit to max if using default controls

    if (!displayControls.length) {
      return nothing;
    }

    return html`
      <ha-control-button-group
        class=${classMap({
          "no-stretch": this.position === "inline",
        })}
      >
        ${displayControls.map((normalized) => {
          let active: boolean;
          let label: string;
          let domain: string;
          let deviceClass: string | undefined;
          let entityState: string;
          let entity: HassEntity | undefined;

          if (normalized.type === "domain") {
            const button = AREA_CONTROLS_BUTTONS[normalized.value];
            const controlEntityIds = controlEntities[normalized.value];

            const entities = controlEntityIds
              .map(
                (entityId) =>
                  this.hass!.states[entityId] as HassEntity | undefined
              )
              .filter((v): v is HassEntity => Boolean(v));

            const groupState = computeGroupEntitiesState(entities);

            active = entities[0] ? stateActive(entities[0], groupState) : false;
            label = this.hass!.localize(
              `ui.card_features.area_controls.${normalized.value}.${active ? "off" : "on"}`
            );
            domain = button.filter.domain;
            deviceClass = button.filter.device_class
              ? ensureArray(button.filter.device_class)[0]
              : undefined;
            entityState = groupState;
          } else if (normalized.type === "entity") {
            entity = this.hass!.states[normalized.value];
            if (!entity) {
              return nothing;
            }

            active = stateActive(entity);
            label = this.hass!.localize(
              `ui.card.common.turn_${active ? "off" : "on"}`
            );
            domain = computeDomain(entity.entity_id);
            entityState = entity.state;
          } else {
            return nothing;
          }

          const activeColor = computeCssVariable(
            domainColorProperties(domain, deviceClass, entityState, true)
          );

          return html`
            <ha-control-button
              style=${styleMap({
                "--active-color": activeColor,
              })}
              .title=${label}
              aria-label=${label}
              class=${active ? "active" : ""}
              .control=${normalized}
              @click=${this._handleButtonTap}
            >
              ${normalized.type === "domain"
                ? html`<ha-domain-icon
                    .hass=${this.hass}
                    .domain=${domain}
                    .deviceClass=${deviceClass}
                    .state=${entityState}
                  ></ha-domain-icon>`
                : html`<ha-state-icon
                    .hass=${this.hass}
                    .stateObj=${entity}
                  ></ha-state-icon>`}
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
        :host {
          pointer-events: none !important;
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
        }
        ha-control-button-group {
          pointer-events: auto;
          width: 100%;
        }
        ha-control-button-group.no-stretch {
          width: auto;
          max-width: 100%;
        }
        ha-control-button-group.no-stretch > ha-control-button {
          width: 48px;
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
