import {
  HassEntity,
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  DeviceRegistryEntry,
  getDeviceIntegrationLookup,
} from "../../data/device_registry";
import type { EntityRegistryEntry } from "../../data/entity_registry";
import { subscribeEntityRegistry } from "../../data/entity_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import {
  filterSelectorDevices,
  filterSelectorEntities,
  TargetSelector,
} from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../ha-target-picker";

@customElement("ha-selector-target")
export class HaTargetSelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TargetSelector;

  @property() public value?: HassServiceTarget;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private _entitySources?: EntitySources;

  @state() private _entities?: EntityRegistryEntry[];

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities.filter((entity) => entity.device_id !== null);
      }),
    ];
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("selector") &&
      (this.selector.target.device?.integration ||
        this.selector.target.entity?.integration) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  protected render(): TemplateResult {
    if (
      (this.selector.target.device?.integration ||
        this.selector.target.entity?.integration) &&
      !this._entitySources
    ) {
      return html``;
    }

    return html`<ha-target-picker
      .hass=${this.hass}
      .value=${this.value}
      .helper=${this.helper}
      .deviceFilter=${this._filterDevices}
      .entityFilter=${this._filterEntities}
      .disabled=${this.disabled}
    ></ha-target-picker>`;
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector.target.entity) {
      return true;
    }

    return filterSelectorEntities(
      this.selector.target.entity,
      entity,
      this._entitySources
    );
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.target.device) {
      return true;
    }

    const deviceIntegrations =
      this._entitySources && this._entities
        ? this._deviceIntegrationLookup(this._entitySources, this._entities)
        : undefined;

    return filterSelectorDevices(
      this.selector.target.device,
      device,
      deviceIntegrations
    );
  };

  static get styles(): CSSResultGroup {
    return css`
      ha-target-picker {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-target": HaTargetSelector;
  }
}
