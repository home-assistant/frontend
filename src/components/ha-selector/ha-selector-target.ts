import type {
  HassEntity,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { getDeviceIntegrationLookup } from "../../data/device_registry";
import type { EntitySources } from "../../data/entity_sources";
import { fetchEntitySourcesWithCache } from "../../data/entity_sources";
import type { TargetSelector } from "../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
  computeCreateDomains,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-target-picker";

@customElement("ha-selector-target")
export class HaTargetSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: TargetSelector;

  @property({ type: Object }) public value?: HassServiceTarget;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private _entitySources?: EntitySources;

  @state() private _createDomains: string[] | undefined;

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

  private _hasIntegration(selector: TargetSelector) {
    return (
      (selector.target?.entity &&
        ensureArray(selector.target.entity).some(
          (filter) => filter.integration
        )) ||
      (selector.target?.device &&
        ensureArray(selector.target.device).some(
          (device) => device.integration
        ))
    );
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (
      changedProperties.has("selector") &&
      this._hasIntegration(this.selector) &&
      !this._entitySources
    ) {
      fetchEntitySourcesWithCache(this.hass).then((sources) => {
        this._entitySources = sources;
      });
    }
    if (changedProperties.has("selector")) {
      this._createDomains = computeCreateDomains(this.selector);
    }
  }

  protected render() {
    if (this._hasIntegration(this.selector) && !this._entitySources) {
      return nothing;
    }

    return html` ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-target-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .deviceFilter=${this._filterDevices}
        .entityFilter=${this._filterEntities}
        .disabled=${this.disabled}
        .createDomains=${this._createDomains}
      ></ha-target-picker>`;
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    if (!this.selector.target?.entity) {
      return true;
    }

    return ensureArray(this.selector.target.entity).some((filter) =>
      filterSelectorEntities(filter, entity, this._entitySources)
    );
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

    return ensureArray(this.selector.target.device).some((filter) =>
      filterSelectorDevices(filter, device, deviceIntegrations)
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
