import { HassEntity, HassServiceTarget } from "home-assistant-js-websocket";
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
import { EntityRegistryEntry } from "../../data/entity_registry";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../data/entity_sources";
import {
  filterSelectorDevices,
  filterSelectorEntities,
  TargetSelector,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-target-picker";

@customElement("ha-selector-target")
export class HaTargetSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TargetSelector;

  @property() public value?: HassServiceTarget;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private _entitySources?: EntitySources;

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("selector") &&
      (this.selector.target?.device?.integration ||
        this.selector.target?.entity?.integration) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
  }

  protected render(): TemplateResult {
    if (
      (this.selector.target?.device?.integration ||
        this.selector.target?.entity?.integration) &&
      !this._entitySources
    ) {
      return html``;
    }

    return html`<ha-target-picker
      .hass=${this.hass}
      .value=${this.value}
      .helper=${this.helper}
      .deviceFilter=${this._filterDevices}
      .entityFilter=${this._filterStates}
      .entityRegFilter=${this._filterRegEntities}
      .includeDeviceClasses=${this.selector.target?.entity?.device_class
        ? [this.selector.target?.entity.device_class]
        : undefined}
      .includeDomains=${this.selector.target?.entity?.domain
        ? [this.selector.target?.entity.domain]
        : undefined}
      .disabled=${this.disabled}
    ></ha-target-picker>`;
  }

  private _filterStates = (entity: HassEntity): boolean => {
    if (!this.selector.target?.entity) {
      return true;
    }

    return filterSelectorEntities(
      this.selector.target.entity,
      entity,
      this._entitySources
    );
  };

  private _filterRegEntities = (entity: EntityRegistryEntry): boolean => {
    if (this.selector.target?.entity?.integration) {
      if (entity.platform !== this.selector.target.entity.integration) {
        return false;
      }
    }
    return true;
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.selector.target?.device) {
      return true;
    }

    const deviceIntegrations = this._entitySources
      ? this._deviceIntegrationLookup(
          this._entitySources,
          Object.values(this.hass.entities)
        )
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
