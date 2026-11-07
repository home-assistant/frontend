import type { ContextType } from "@lit/context";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiChartLine, mdiShape } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import {
  computeEntityNameParts,
  computeEntitySearchLabels,
} from "../../../../common/entity/compute_entity_name_display";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../../components/ha-picker-combo-box";
import type { PickerValueRenderer } from "../../../../components/ha-picker-field";
import "../../../../components/ha-svg-icon";
import {
  formattersContext,
  registriesContext,
  statesContext,
} from "../../../../data/context";
import type { DeviceConsumptionEnergyPreference } from "../../../../data/energy";
import { computeEnergyLabel } from "../../../../data/energy";
import { domainToName } from "../../../../data/integration";
import {
  getStatisticLabel,
  type StatisticsMetaData,
} from "../../../../data/recorder";
import type {
  HomeAssistantFormatters,
  ValueChangedEvent,
} from "../../../../types";

interface UpstreamDeviceComboBoxItem extends PickerComboBoxItem {
  stateObj?: HassEntity;
}

const SEARCH_KEYS = [
  { name: "primary", weight: 10 },
  { name: "search_labels.entityName", weight: 10 },
  { name: "search_labels.friendlyName", weight: 9 },
  { name: "search_labels.deviceName", weight: 8 },
  { name: "search_labels.parentDeviceName", weight: 6 },
  { name: "search_labels.areaName", weight: 6 },
  { name: "search_labels.domainName", weight: 4 },
  { name: "id", weight: 2 },
];

@customElement("ha-energy-upstream-device-picker")
export class HaEnergyUpstreamDevicePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: "empty-label" }) public emptyLabel?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false })
  public possibleParents: DeviceConsumptionEnergyPreference[] = [];

  @property({ attribute: false })
  public statsMetadata?: Record<string, StatisticsMetaData>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityName"]
  >({
    transformer: ({ formatEntityName }) => formatEntityName,
  })
  private _formatEntityName!: HomeAssistantFormatters["formatEntityName"];

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  private _computeItem = (statisticId: string): UpstreamDeviceComboBoxItem => {
    // Use the energy config's custom display name when the user has set one.
    const name = this.possibleParents.find(
      (parent) => parent.stat_consumption === statisticId
    )?.name;
    const stateObj = this._states[statisticId];

    if (stateObj) {
      const { area: areaName } = computeEntityNameParts(
        stateObj,
        this._registries
      );

      return {
        id: statisticId,
        // Match the label shown in the device list and the graphs.
        primary: computeEnergyLabel(
          this._states,
          this._formatEntityName,
          statisticId,
          this.statsMetadata?.[statisticId],
          name
        ),
        secondary: areaName,
        stateObj,
        search_labels: computeEntitySearchLabels(stateObj, this._registries),
      };
    }

    const label = getStatisticLabel(
      this._states,
      this._formatEntityName,
      statisticId,
      this.statsMetadata?.[statisticId]
    );
    const isExternal = statisticId.includes(":") && !statisticId.includes(".");

    if (isExternal) {
      const domainName = domainToName(
        this._localize,
        statisticId.split(":")[0]
      );
      return {
        id: statisticId,
        primary: name || label,
        secondary: domainName,
        icon_path: mdiChartLine,
        search_labels: { label, domainName },
      };
    }

    return {
      id: statisticId,
      primary: name || label,
      secondary: this._localize("ui.components.statistic-picker.no_state"),
      icon_path: mdiShape,
      search_labels: { label },
    };
  };

  private _items = memoizeOne(
    (
      _states: ContextType<typeof statesContext>,
      _registries: ContextType<typeof registriesContext>,
      _formatEntityName: HomeAssistantFormatters["formatEntityName"],
      _localize: LocalizeFunc,
      _value: string | undefined,
      _possibleParents: DeviceConsumptionEnergyPreference[],
      _statsMetadata?: Record<string, StatisticsMetaData>
    ): UpstreamDeviceComboBoxItem[] => {
      const items = this.possibleParents.map((parent) =>
        this._computeItem(parent.stat_consumption)
      );

      // Make sure the current value is selectable even if it is no longer
      // part of the possible parents, so it doesn't render as unknown.
      if (this.value && !items.some((item) => item.id === this.value)) {
        items.unshift(this._computeItem(this.value));
      }

      return items;
    }
  );

  private _getItems = () =>
    this._items(
      this._states,
      this._registries,
      this._formatEntityName,
      this._localize,
      this.value,
      this.possibleParents,
      this.statsMetadata
    );

  private _renderItem = (item: UpstreamDeviceComboBoxItem) => html`
    ${
      item.stateObj
        ? html`
            <state-badge slot="start" .stateObj=${item.stateObj}></state-badge>
          `
        : item.icon_path
          ? html`
              <ha-svg-icon
                style="margin: 0 4px"
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>
            `
          : nothing
    }
    <span slot="headline">${item.primary}</span>
    ${
      item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing
    }
  `;

  private _rowRenderer: RenderItemFunction<UpstreamDeviceComboBoxItem> = (
    item,
    index
  ) => html`
    <ha-combo-box-item .borderTop=${index !== 0}>
      ${this._renderItem(item)}
    </ha-combo-box-item>
  `;

  private _valueRenderer: PickerValueRenderer = (value) =>
    this._renderItem(
      this._getItems().find((item) => item.id === value) ??
        this._computeItem(value)
    );

  protected render() {
    return html`
      <ha-generic-picker
        use-top-label
        .label=${this.label}
        .helper=${this.helper}
        .value=${this.value}
        .disabled=${this.disabled}
        .emptyLabel=${this.emptyLabel}
        .getItems=${this._getItems}
        .rowRenderer=${this._rowRenderer}
        .valueRenderer=${this._valueRenderer}
        .searchKeys=${SEARCH_KEYS}
        @value-changed=${this._valueChanged}
      ></ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-upstream-device-picker": HaEnergyUpstreamDevicePicker;
  }
}
