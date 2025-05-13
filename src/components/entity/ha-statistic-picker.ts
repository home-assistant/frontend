import { mdiChartLine, mdiClose, mdiMenuDown, mdiShape } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  nothing,
  type CSSResultGroup,
  type PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceName } from "../../common/entity/compute_device_name";
import { computeEntityName } from "../../common/entity/compute_entity_name";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import { computeRTL } from "../../common/util/compute_rtl";
import { debounce } from "../../common/util/debounce";
import { domainToName } from "../../data/integration";
import {
  getStatisticIds,
  getStatisticLabel,
  type StatisticsMetaData,
} from "../../data/recorder";
import type { HomeAssistant } from "../../types";
import "../ha-combo-box-item";
import "../ha-icon-button";
import "../ha-input-helper-text";
import type { HaMdListItem } from "../ha-md-list-item";
import "../ha-svg-icon";
import "./ha-statistic-combo-box";
import type { HaStatisticComboBox } from "./ha-statistic-combo-box";
import "./state-badge";

interface StatisticItem {
  primary: string;
  secondary?: string;
  iconPath?: string;
  stateObj?: HassEntity;
}

@customElement("ha-statistic-picker")
export class HaStatisticPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: "statistic-types" })
  public statisticTypes?: "mean" | "sum";

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property({ attribute: false, type: Array })
  public statisticIds?: StatisticsMetaData[];

  /**
   * Show only statistics natively stored with these units of measurements.
   * @type {Array}
   * @attr include-statistics-unit-of-measurement
   */
  @property({
    type: Array,
    attribute: "include-statistics-unit-of-measurement",
  })
  public includeStatisticsUnitOfMeasurement?: string | string[];

  /**
   * Show only statistics with these unit classes.
   * @attr include-unit-class
   */
  @property({ attribute: "include-unit-class" })
  public includeUnitClass?: string | string[];

  /**
   * Show only statistics with these device classes.
   * @attr include-device-class
   */
  @property({ attribute: "include-device-class" })
  public includeDeviceClass?: string | string[];

  /**
   * Show only statistics on entities.
   * @type {Boolean}
   * @attr entities-only
   */
  @property({ type: Boolean, attribute: "entities-only" })
  public entitiesOnly = false;

  /**
   * List of statistics to be excluded.
   * @type {Array}
   * @attr exclude-statistics
   */
  @property({ type: Array, attribute: "exclude-statistics" })
  public excludeStatistics?: string[];

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @query("#anchor") private _anchor?: HaMdListItem;

  @query("#input") private _input?: HaStatisticComboBox;

  @state() private _opened = false;

  public willUpdate(changedProps: PropertyValues) {
    if (
      (!this.hasUpdated && !this.statisticIds) ||
      changedProps.has("statisticTypes")
    ) {
      this._getStatisticIds();
    }
  }

  private async _getStatisticIds() {
    this.statisticIds = await getStatisticIds(this.hass, this.statisticTypes);
  }

  private _statisticMetaData = memoizeOne(
    (statisticId: string, statisticIds: StatisticsMetaData[]) => {
      if (!statisticIds) {
        return undefined;
      }
      return statisticIds.find(
        (statistic) => statistic.statistic_id === statisticId
      );
    }
  );

  private _renderContent() {
    const statisticId = this.value || "";

    if (!this.value) {
      return html`
        <span slot="headline" class="placeholder"
          >${this.placeholder ??
          this.hass.localize(
            "ui.components.statistic-picker.placeholder"
          )}</span
        >
        <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
      `;
    }

    const item = this._computeItem(statisticId);

    const showClearIcon =
      !this.required && !this.disabled && !this.hideClearIcon;

    return html`
      ${item.stateObj
        ? html`
            <state-badge
              .hass=${this.hass}
              .stateObj=${item.stateObj}
              slot="start"
            ></state-badge>
          `
        : item.iconPath
          ? html`<ha-svg-icon
              slot="start"
              .path=${item.iconPath}
            ></ha-svg-icon>`
          : nothing}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
      ${showClearIcon
        ? html`<ha-icon-button
            class="clear"
            slot="end"
            @click=${this._clear}
            .path=${mdiClose}
          ></ha-icon-button>`
        : nothing}
      <ha-svg-icon class="edit" slot="end" .path=${mdiMenuDown}></ha-svg-icon>
    `;
  }

  private _computeItem(statisticId: string): StatisticItem {
    const stateObj = this.hass.states[statisticId];

    if (stateObj) {
      const { area, device } = getEntityContext(stateObj, this.hass);

      const entityName = computeEntityName(stateObj, this.hass);
      const deviceName = device ? computeDeviceName(device) : undefined;
      const areaName = area ? computeAreaName(area) : undefined;

      const isRTL = computeRTL(this.hass);

      const primary = entityName || deviceName || statisticId;
      const secondary = [areaName, entityName ? deviceName : undefined]
        .filter(Boolean)
        .join(isRTL ? " ◂ " : " ▸ ");

      return {
        primary,
        secondary,
        stateObj,
      };
    }

    const statistic = this.statisticIds
      ? this._statisticMetaData(statisticId, this.statisticIds)
      : undefined;

    if (statistic) {
      const type =
        statisticId.includes(":") && !statisticId.includes(".")
          ? "external"
          : "no_state";

      if (type === "external") {
        const label = getStatisticLabel(this.hass, statisticId, statistic);
        const domain = statisticId.split(":")[0];
        const domainName = domainToName(this.hass.localize, domain);

        return {
          primary: label,
          secondary: domainName,
          iconPath: mdiChartLine,
        };
      }
    }

    return {
      primary: statisticId,
      iconPath: mdiShape,
    };
  }

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <div class="container">
        ${!this._opened
          ? html`
              <ha-combo-box-item
                .disabled=${this.disabled}
                id="anchor"
                type="button"
                compact
                @click=${this._showPicker}
              >
                ${this._renderContent()}
              </ha-combo-box-item>
            `
          : html`
              <ha-statistic-combo-box
                id="input"
                .hass=${this.hass}
                .autofocus=${this.autofocus}
                .allowCustomEntity=${this.allowCustomEntity}
                .label=${this.hass.localize("ui.common.search")}
                .value=${this.value}
                .includeStatisticsUnitOfMeasurement=${this
                  .includeStatisticsUnitOfMeasurement}
                .includeUnitClass=${this.includeUnitClass}
                .includeDeviceClass=${this.includeDeviceClass}
                .statisticTypes=${this.statisticTypes}
                .statisticIds=${this.statisticIds}
                .excludeStatistics=${this.excludeStatistics}
                hide-clear-icon
                @opened-changed=${this._debounceOpenedChanged}
                @input=${stopPropagation}
              ></ha-statistic-combo-box>
            `}
        ${this._renderHelper()}
      </div>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
      : nothing;
  }

  private _clear(e) {
    e.stopPropagation();
    this.value = undefined;
    fireEvent(this, "value-changed", { value: undefined });
    fireEvent(this, "change");
  }

  private async _showPicker() {
    if (this.disabled) {
      return;
    }
    this._opened = true;
    await this.updateComplete;
    this._input?.focus();
    this._input?.open();
  }

  // Multiple calls to _openedChanged can be triggered in quick succession
  // when the menu is opened
  private _debounceOpenedChanged = debounce(
    (ev) => this._openedChanged(ev),
    10
  );

  private async _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    const opened = ev.detail.value;
    if (this._opened && !opened) {
      this._opened = false;
      await this.updateComplete;
      this._anchor?.focus();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .container {
          position: relative;
          display: block;
        }
        ha-combo-box-item {
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-radius: 4px;
          border-end-end-radius: 0;
          border-end-start-radius: 0;
          --md-list-item-one-line-container-height: 56px;
          --md-list-item-two-line-container-height: 56px;
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
          --md-list-item-leading-space: 8px;
          --md-list-item-trailing-space: 8px;
          --ha-md-list-item-gap: 8px;
          /* Remove the default focus ring */
          --md-focus-ring-width: 0px;
          --md-focus-ring-duration: 0s;
        }

        /* Add Similar focus style as the text field */
        ha-combo-box-item:after {
          display: block;
          content: "";
          position: absolute;
          pointer-events: none;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          width: 100%;
          background-color: var(
            --mdc-text-field-idle-line-color,
            rgba(0, 0, 0, 0.42)
          );
          transform:
            height 180ms ease-in-out,
            background-color 180ms ease-in-out;
        }

        ha-combo-box-item:focus:after {
          height: 2px;
          background-color: var(--mdc-theme-primary);
        }

        ha-combo-box-item ha-svg-icon[slot="start"] {
          margin: 0 4px;
        }
        .clear {
          margin: 0 -8px;
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }
        .edit {
          --mdc-icon-size: 20px;
          width: 32px;
        }
        label {
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
    "ha-statistic-picker": HaStatisticPicker;
  }
}
