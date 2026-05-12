import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import { fireEvent } from "../../../common/dom/fire_event";
import type { DeviceRegistryEntry } from "../../../data/device/device_registry";
import { getDeviceIntegrationLookup } from "../../../data/device/device_registry";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity/entity";
import type { EntitySources } from "../../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../data/entity/entity_sources";
import type { TargetSelector } from "../../../data/selector";
import {
  filterSelectorDevices,
  filterSelectorEntities,
} from "../../../data/selector";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../types";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";
import "../../ha-adaptive-dialog";
import "../../ha-dialog-header";
import "../../ha-icon-button";
import "../../ha-icon-next";
import "../../ha-md-list";
import "../../ha-md-list-item";
import "../../ha-svg-icon";
import "../../list/ha-list-base";
import "../ha-target-picker-item-row";
import type { TargetDetailsDialogParams } from "./show-dialog-target-details";

@customElement("ha-dialog-target-details")
class DialogTargetDetails extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: TargetDetailsDialogParams;

  @state() private _opened = false;

  @state() private _entitySources?: EntitySources;

  @state() private _entitySourcesLoaded = false;

  private _deviceIntegrationLookup = memoizeOne(getDeviceIntegrationLookup);

  public showDialog(params: TargetDetailsDialogParams): void {
    this._params = params;
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    return true;
  }

  private _dialogClosed() {
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    this._params = undefined;
    this._entitySources = undefined;
    this._entitySourcesLoaded = false;
  }

  private _hasIntegration(selector: TargetSelector) {
    return (
      (selector.target?.entity &&
        ensureArray(selector.target.entity).some((e) => e.integration)) ||
      (selector.target?.device &&
        ensureArray(selector.target.device).some((d) => d.integration))
    );
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!changedProperties.has("_params")) {
      return;
    }
    if (
      this._params?.selector &&
      this._hasIntegration(this._params.selector) &&
      !this._entitySourcesLoaded
    ) {
      this._loadEntitySources();
    }
  }

  private async _loadEntitySources(): Promise<void> {
    try {
      this._entitySources = await fetchEntitySourcesWithCache(this.hass);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load entity sources for target details", err);
    } finally {
      this._entitySourcesLoaded = true;
    }
  }

  private _filterEntities = (entity: HassEntity): boolean => {
    const target = this._selectorTarget();
    if (!target?.entity) {
      return true;
    }
    return ensureArray(target.entity).some((e) =>
      filterSelectorEntities(e, entity, this._entitySources)
    );
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    const target = this._selectorTarget();
    if (!target?.device) {
      return true;
    }
    const deviceIntegrations = this._entitySources
      ? this._deviceIntegrationLookup(
          this._entitySources,
          Object.values(this.hass.entities)
        )
      : undefined;
    return ensureArray(target.device).some((d) =>
      filterSelectorDevices(d, device, deviceIntegrations)
    );
  };

  private _selectorTarget() {
    return this._params?.selector?.target || null;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    let deviceFilter: HaDevicePickerDeviceFilterFunc | undefined;
    let entityFilter: HaEntityPickerEntityFilterFunc | undefined;
    let includeDomains: string[] | undefined;
    let includeDeviceClasses: string[] | undefined;
    let primaryEntitiesOnly: boolean | undefined;

    if (this._params.selector) {
      deviceFilter = this._filterDevices;
      entityFilter = this._filterEntities;
      primaryEntitiesOnly = this._params.selector.target?.primary_entities_only;
    } else {
      deviceFilter = this._params.deviceFilter;
      entityFilter = this._params.entityFilter;
      includeDomains = this._params.includeDomains;
      includeDeviceClasses = this._params.includeDeviceClasses;
      primaryEntitiesOnly = this._params.primaryEntitiesOnly;
    }

    const waitingForSources =
      this._params.selector &&
      this._hasIntegration(this._params.selector) &&
      !this._entitySourcesLoaded;

    return html`
      <ha-adaptive-dialog
        .open=${this._opened}
        header-title=${this.hass.localize(
          "ui.components.target-picker.target_details"
        )}
        @closed=${this._dialogClosed}
      >
        <div class="type-wrapper">
          <div class="type-label">
            ${this.hass.localize(
              `ui.components.target-picker.type.${this._params.type}`
            )}
          </div>
          <ha-list-base
            .ariaLabel=${`${this.hass.localize(`ui.components.target-picker.type.${this._params.type}`)}: ${this._params.title}`}
            wrap-focus
          >
            ${waitingForSources
              ? nothing
              : html`
                  <ha-target-picker-item-row
                    .hass=${this.hass}
                    .type=${this._params.type}
                    .itemId=${this._params.itemId}
                    .deviceFilter=${deviceFilter}
                    .entityFilter=${entityFilter}
                    .includeDomains=${includeDomains}
                    .includeDeviceClasses=${includeDeviceClasses}
                    .primaryEntitiesOnly=${primaryEntitiesOnly}
                    expand
                  ></ha-target-picker-item-row>
                `}
          </ha-list-base>
        </div>
      </ha-adaptive-dialog>
    `;
  }

  static styles = css`
    .type-wrapper {
      display: flex;
      flex-direction: column;
      border-radius: var(--ha-border-radius-xl);
      border: var(--ha-border-width-sm) solid
        var(--ha-color-border-neutral-normal);
      overflow: hidden;
    }
    .type-label {
      background-color: var(--ha-color-surface-low);
      padding: var(--ha-space-1) var(--ha-space-3);
      font-weight: var(--ha-font-weight-bold);
      display: flex;
      align-items: center;
      height: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-target-details": DialogTargetDetails;
  }
}
