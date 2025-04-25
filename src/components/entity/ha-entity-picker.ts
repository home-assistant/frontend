import "@material/mwc-menu/mwc-menu-surface";
import { mdiClose, mdiMenuDown, mdiShape } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { computeRTL } from "../../common/util/compute_rtl";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box-item";
import "../ha-icon-button";
import type { HaMdListItem } from "../ha-md-list-item";
import "../ha-svg-icon";
import "./ha-entity-combo-box";
import type {
  HaEntityComboBox,
  HaEntityComboBoxEntityFilterFunc,
} from "./ha-entity-combo-box";
import "./state-badge";

@customElement("ha-entity-picker")
class HaEntityPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ attribute: false, type: Array }) public createDomains?: string[];

  /**
   * Show entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * Show only entities with these unit of measuments.
   * @type {Array}
   * @attr include-unit-of-measurement
   */
  @property({ type: Array, attribute: "include-unit-of-measurement" })
  public includeUnitOfMeasurement?: string[];

  /**
   * List of allowed entities to show.
   * @type {Array}
   * @attr include-entities
   */
  @property({ type: Array, attribute: "include-entities" })
  public includeEntities?: string[];

  /**
   * List of entities to be excluded.
   * @type {Array}
   * @attr exclude-entities
   */
  @property({ type: Array, attribute: "exclude-entities" })
  public excludeEntities?: string[];

  @property({ attribute: false })
  public entityFilter?: HaEntityComboBoxEntityFilterFunc;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: "item-label-path" }) public itemLabelPath = "label";

  @query("#anchor", true) private _anchor?: HaMdListItem;

  @query("#input") private _input?: HaEntityComboBox;

  @state() private _opened = false;

  private _renderContent() {
    const entityId = this.value || "";

    if (!this.value) {
      return html`
        <span slot="headline" class="placeholder"> Select an entity </span>
        <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
      `;
    }

    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`
        <ha-svg-icon slot="start" .path=${mdiShape}></ha-svg-icon>
        <span slot="headline">${entityId}</span>
        <ha-icon-button
          class="clear"
          slot="end"
          @click=${this._clear}
          .path=${mdiClose}
        ></ha-icon-button>
        <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
      `;
    }

    const { area, device } = getEntityContext(stateObj, this.hass);

    const entityName = computeEntityName(stateObj, this.hass);
    const deviceName = device ? computeDeviceName(device) : undefined;
    const areaName = area ? computeAreaName(area) : "No area";

    const isRTL = computeRTL(this.hass);

    const primary = entityName || deviceName || entityId;
    const secondary = [areaName, entityName ? deviceName : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ");

    return html`
      <state-badge
        .hass=${this.hass}
        .stateObj=${stateObj}
        slot="start"
      ></state-badge>
      <span slot="headline">${primary}</span>
      <span slot="supporting-text">${secondary}</span>
      <ha-icon-button
        class="clear"
        slot="end"
        @click=${this._clear}
        .path=${mdiClose}
      ></ha-icon-button>
      <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
    `;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      ${this.label ? html`<p class="label">${this.label}</p>` : nothing}
      <div class="container">
        <ha-combo-box-item
          id="anchor"
          type="button"
          compact
          @click=${this._showPicker}
        >
          ${this._renderContent()}
        </ha-combo-box-item>
        <mwc-menu-surface
          .open=${this._opened}
          .anchor=${this._anchor}
          @closed=${this._onClosed}
          @opened=${this._onOpened}
          @opened-changed=${this._openedChanged}
          @input=${stopPropagation}
        >
          <ha-entity-combo-box
            id="input"
            .hass=${this.hass}
            .itemLabelPath=${this.itemLabelPath}
            .autofocus=${this.autofocus}
            .allowCustomEntity=${this.allowCustomEntity}
            .label=${this.hass.localize("ui.common.search")}
            .value=${this.value}
            .createDomains=${this.createDomains}
            .includeDomains=${this.includeDomains}
            .excludeDomains=${this.excludeDomains}
            .includeDeviceClasses=${this.includeDeviceClasses}
            .includeUnitOfMeasurement=${this.includeUnitOfMeasurement}
            .includeEntities=${this.includeEntities}
            .excludeEntities=${this.excludeEntities}
            .entityFilter=${this.entityFilter}
            hide-clear-icon
          ></ha-entity-combo-box>
        </mwc-menu-surface>
        ${this._renderHelper()}
      </div>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
      : "";
  }

  private _clear(e) {
    e.stopPropagation();
    this.value = undefined;
    fireEvent(this, "value-changed", {
      value: undefined,
    });
  }

  private _showPicker() {
    this._opened = true;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
  }

  private async _onOpened() {
    this._opened = true;
    await this._input?.focus();
    await this._input?.open();
  }

  private _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    if (this._opened && !ev.detail.value) {
      this._opened = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        mwc-menu-surface {
          --mdc-menu-min-width: 100%;
        }
        .container {
          position: relative;
          display: block;
        }
        ha-combo-box-item {
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-radius: 4px;
          --md-list-item-one-line-container-height: 56px;
          --md-list-item-two-line-container-height: 56px;
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
          --md-list-item-leading-space: 8px;
          --md-list-item-trailing-space: 8px;
          --ha-md-list-item-gap: 8px;
          --md-focus-ring-width: 2px;
          --md-focus-ring-duration: 0s;
          --md-focus-ring-color: var(--secondary-text-color);
        }
        ha-combo-box-item ha-svg-icon[slot="start"] {
          margin: 0 4px;
        }
        .clear {
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }
        .edit {
          --mdc-icon-size: 20px;
          width: 32px;
        }
        .label {
          display: block;
          margin: 0 0 8px;
        }
        .placeholder {
          color: var(--secondary-text-color);
          padding: 0 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-picker": HaEntityPicker;
  }
}
