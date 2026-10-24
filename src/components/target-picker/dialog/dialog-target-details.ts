import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../common/array/ensure-array";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
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
import "../../ha-button";
import "../../ha-dialog-footer";
import "../../ha-icon-button";
import "../../ha-icon-next";
import "../../ha-svg-icon";
import "../../list/ha-list-base";
import "../ha-target-picker-item-row";
import type { TargetExclusion } from "../target-exclusions";
import {
  isShared,
  resolveItemExclusions,
  resolveTargetItemEntities,
  toggleTargetRow,
} from "../target-exclusions";
import type { TargetDetailsDialogParams } from "./show-dialog-target-details";

@customElement("ha-dialog-target-details")
class DialogTargetDetails extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: TargetDetailsDialogParams;

  @state() private _opened = false;

  @state() private _entitySources?: EntitySources;

  @state() private _entitySourcesLoaded = false;

  @state() private _initialExclusions: TargetExclusion[] = [];

  @state() private _exclusions: TargetExclusion[] = [];

  private _exclusionsRequest = 0;

  private _otherTargetEntities = memoizeOne(
    (entities?: string[]) => new Set(entities)
  );

  private _deviceIntegrationLookup = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getDeviceIntegrationLookup(Object.values(entities))
  );

  public showDialog(params: TargetDetailsDialogParams): void {
    this._params = params;
    this._initialExclusions = params.exclusions ?? [];
    this._exclusions = this._initialExclusions;
    this._opened = true;
    if (!params.exclusions && params.exclude) {
      this._resolveExclusions(params);
    }
  }

  private async _resolveExclusions(params: TargetDetailsDialogParams) {
    const request = ++this._exclusionsRequest;
    let exclusions: TargetExclusion[];
    try {
      exclusions = await resolveItemExclusions(
        this.hass,
        { type: params.type, id: params.itemId },
        params.exclude,
        params.selector
          ? params.selector.target?.primary_entities_only
          : params.primaryEntitiesOnly
      );
    } catch (_err) {
      // The details still show the target, only without what is excluded.
      return;
    }
    if (request !== this._exclusionsRequest || this._params !== params) {
      return;
    }
    this._initialExclusions = exclusions;
    this._exclusions = exclusions;
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
    this._initialExclusions = [];
    this._exclusions = [];
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
      filterSelectorEntities(
        e,
        entity,
        this._entitySources,
        this.hass.entities,
        this.hass.devices
      )
    );
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    const target = this._selectorTarget();
    if (!target?.device) {
      return true;
    }
    const deviceIntegrations = this._hasIntegration({ target })
      ? this._deviceIntegrationLookup(this.hass.entities)
      : undefined;
    return ensureArray(target.device).some((d) =>
      filterSelectorDevices(d, device, deviceIntegrations)
    );
  };

  private _combinedFilter = memoizeOne(
    (
      entityFilter: HaEntityPickerEntityFilterFunc | undefined,
      activeFilter: (entityId: string) => boolean
    ): HaEntityPickerEntityFilterFunc =>
      (stateObj) =>
        (!entityFilter || entityFilter(stateObj)) &&
        activeFilter(stateObj.entity_id)
  );

  private _selectorTarget() {
    return this._params?.selector?.target || null;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const { activeFilter } = this._params;

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

    if (activeFilter) {
      entityFilter = this._combinedFilter(entityFilter, activeFilter);
    }

    const selectable = !!this._params.exclusionsChanged;
    const showExclusions =
      selectable || !!this._params.exclusions || !!this._params.exclude;

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
            ${
              waitingForSources
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
                      .selectable=${selectable}
                      .exclusions=${showExclusions ? this._exclusions : undefined}
                      @target-selection-changed=${this._selectionChanged}
                      expand
                    ></ha-target-picker-item-row>
                  `
            }
          </ha-list-base>
        </div>
        ${
          selectable
            ? html`
                <ha-dialog-footer slot="footer">
                  <ha-button
                    slot="secondaryAction"
                    appearance="plain"
                    @click=${this.closeDialog}
                  >
                    ${this.hass.localize("ui.common.cancel")}
                  </ha-button>
                  <ha-button slot="primaryAction" @click=${this._apply}>
                    ${this.hass.localize("ui.common.apply")}
                  </ha-button>
                </ha-dialog-footer>
              `
            : nothing
        }
      </ha-adaptive-dialog>
    `;
  }

  private _selectionChanged(
    ev: HASSDomEvent<HASSDomEvents["target-selection-changed"]>
  ) {
    ev.stopPropagation();
    const before = this._exclusions;
    this._exclusions = toggleTargetRow({
      ...ev.detail,
      exclusions: before,
      initial: this._initialExclusions,
      otherTargetEntities: this._otherTargetEntities(
        this._params?.otherTargetEntities
      ),
    });
    this._exclusions
      .filter(
        (exclusion) =>
          exclusion.type !== "entity" &&
          !before.includes(exclusion) &&
          !this._initialExclusions.includes(exclusion)
      )
      .forEach((exclusion) => this._resolveRemoved(exclusion));
  }

  private async _resolveRemoved(exclusion: TargetExclusion) {
    let removed: string[];
    try {
      removed = await resolveTargetItemEntities(this.hass, exclusion, false);
    } catch (_err) {
      return;
    }
    if (!this._exclusions.includes(exclusion)) {
      return;
    }

    const shared = isShared(
      removed,
      this._otherTargetEntities(this._params?.otherTargetEntities)
    );
    this._exclusions = this._exclusions.map((current) =>
      current === exclusion ? { ...exclusion, removed, shared } : current
    );
  }

  private _apply() {
    this._params?.exclusionsChanged?.(
      this._initialExclusions,
      this._exclusions
    );
    this.closeDialog();
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
