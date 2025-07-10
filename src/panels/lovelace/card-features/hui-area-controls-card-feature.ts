import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import { generateEntityFilter } from "../../../common/entity/entity_filter";
import { computeGroupEntitiesState } from "../../../common/entity/group_entities";
import { stateActive } from "../../../common/entity/state_active";
import { domainColorProperties } from "../../../common/entity/state_color";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-domain-icon";
import "../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../data/area_registry";
import type { GroupToggleDialogParams } from "../../../dialogs/more-info/components/voice/ha-more-info-view-toggle-group";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
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
  domain: string;
  device_class?: string;
}

const coverButton = (deviceClass: string) => ({
  domain: "cover",
  device_class: deviceClass,
});

export const AREA_CONTROLS_BUTTONS: Record<AreaControl, AreaControlsButton> = {
  light: {
    domain: "light",
  },
  fan: {
    domain: "fan",
  },
  switch: {
    domain: "switch",
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
        domain: controlButton.domain,
        device_class: controlButton.device_class,
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

  private async _handleButtonTap(ev: MouseEvent) {
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

    const { domain, device_class: dc } = AREA_CONTROLS_BUTTONS[control];

    const domainName = this.hass.localize(
      `component.${domain}.entity_component.${dc ?? "_"}.name`
    );

    showMoreInfoDialog(this, {
      entityId: null,
      parentView: {
        title: computeAreaName(this._area!) || "",
        subtitle: domainName,
        tag: "ha-more-info-view-toggle-group",
        import: () =>
          import(
            "../../../dialogs/more-info/components/voice/ha-more-info-view-toggle-group"
          ),
        params: {
          entityIds: entitiesIds,
        } as GroupToggleDialogParams,
      },
    });
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
      <ha-control-button-group
        class=${classMap({
          "no-stretch": this.position === "inline",
        })}
      >
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

          const domain = button.domain;
          const dc = button.device_class;

          const domainName = this.hass!.localize(
            `component.${domain}.entity_component.${dc ?? "_"}.name`
          );

          const label = `${domainName}: ${this.hass!.localize(
            `ui.card_features.area_controls.open_more_info`
          )}`;

          const icon =
            domain === "light" && !active ? "mdi:lightbulb-off" : undefined;

          const deviceClass = button.device_class
            ? ensureArray(button.device_class)[0]
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
