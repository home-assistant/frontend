import "@material/mwc-button/mwc-button";
import "@material/mwc-formfield/mwc-formfield";
import "@material/mwc-list/mwc-list-item";
import { mdiPencil } from "@mdi/js";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { domainIcon } from "../../../common/entity/domain_icon";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { formatNumber } from "../../../common/number/format_number";
import { stringCompare } from "../../../common/string/compare";
import {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-area-picker";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon";
import "../../../components/ha-icon-picker";
import "../../../components/ha-radio";
import "../../../components/ha-select";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-textfield";
import {
  CameraPreferences,
  CAMERA_ORIENTATIONS,
  CAMERA_SUPPORT_STREAM,
  fetchCameraPrefs,
  STREAM_TYPE_HLS,
  updateCameraPrefs,
} from "../../../data/camera";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import {
  createConfigFlow,
  handleConfigFlowStep,
} from "../../../data/config_flow";
import { DataEntryFlowStepCreateEntry } from "../../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
  fetchEntityRegistry,
  removeEntityRegistryEntry,
  SensorEntityOptions,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import { getNumberDeviceClassConvertibleUnits } from "../../../data/number";
import { getSensorDeviceClassConvertibleUnits } from "../../../data/sensor";
import {
  WeatherUnits,
  getWeatherConvertibleUnits,
} from "../../../data/weather";
import { showAliasesDialog } from "../../../dialogs/aliases/show-dialog-aliases";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showDeviceRegistryDetailDialog } from "../devices/device-registry-detail/show-dialog-device-registry-detail";

const OVERRIDE_DEVICE_CLASSES = {
  cover: [
    [
      "awning",
      "blind",
      "curtain",
      "damper",
      "door",
      "garage",
      "gate",
      "shade",
      "shutter",
      "window",
    ],
  ],
  binary_sensor: [
    ["lock"], // Lock
    ["window", "door", "garage_door", "opening"], // Door
    ["battery", "battery_charging"], // Battery
    ["cold", "gas", "heat"], // Climate
    ["running", "motion", "moving", "occupancy", "presence", "vibration"], // Presence
    ["power", "plug", "light"], // Power
    [
      "smoke",
      "safety",
      "sound",
      "problem",
      "tamper",
      "carbon_monoxide",
      "moisture",
    ], // Alarm
  ],
};

const SWITCH_AS_DOMAINS = ["cover", "fan", "light", "lock", "siren"];

const PRECISIONS = [0, 1, 2, 3, 4, 5, 6];

@customElement("entity-registry-settings")
export class EntityRegistrySettings extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public entry!: ExtEntityRegistryEntry;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _entityId!: string;

  @state() private _deviceClass?: string;

  @state() private _switchAs = "switch";

  @state() private _areaId?: string | null;

  @state() private _disabledBy!: EntityRegistryEntry["disabled_by"];

  @state() private _hiddenBy!: EntityRegistryEntry["hidden_by"];

  @state() private _device?: DeviceRegistryEntry;

  @state() private _helperConfigEntry?: ConfigEntry;

  @state() private _unit_of_measurement?: string | null;

  @state() private _precision?: number | null;

  @state() private _precipitation_unit?: string | null;

  @state() private _pressure_unit?: string | null;

  @state() private _temperature_unit?: string | null;

  @state() private _visibility_unit?: string | null;

  @state() private _wind_speed_unit?: string | null;

  @state() private _error?: string;

  @state() private _submitting?: boolean;

  @state() private _cameraPrefs?: CameraPreferences;

  @state() private _numberDeviceClassConvertibleUnits?: string[];

  @state() private _sensorDeviceClassConvertibleUnits?: string[];

  @state() private _weatherConvertibleUnits?: WeatherUnits;

  private _origEntityId!: string;

  private _deviceLookup?: Record<string, DeviceRegistryEntry>;

  private _deviceClassOptions?: string[][];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._deviceLookup = {};
        for (const device of devices) {
          this._deviceLookup[device.id] = device;
        }
        if (this.entry.device_id) {
          this._device = this._deviceLookup[this.entry.device_id];
        }
      }),
    ];
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (this.entry.config_entry_id) {
      getConfigEntries(this.hass, {
        type: ["helper"],
        domain: this.entry.platform,
      }).then((entries) => {
        this._helperConfigEntry = entries.find(
          (ent) => ent.entry_id === this.entry.config_entry_id
        );
      });
    }
  }

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (!changedProperties.has("entry")) {
      return;
    }

    this._error = undefined;
    this._name = this.entry.name || "";
    this._icon = this.entry.icon || "";
    this._deviceClass =
      this.entry.device_class || this.entry.original_device_class;
    this._origEntityId = this.entry.entity_id;
    this._areaId = this.entry.area_id;
    this._entityId = this.entry.entity_id;
    this._disabledBy = this.entry.disabled_by;
    this._hiddenBy = this.entry.hidden_by;
    this._device =
      this.entry.device_id && this._deviceLookup
        ? this._deviceLookup[this.entry.device_id]
        : undefined;

    const domain = computeDomain(this.entry.entity_id);

    if (domain === "camera" && isComponentLoaded(this.hass, "stream")) {
      const stateObj: HassEntity | undefined =
        this.hass.states[this.entry.entity_id];
      if (
        stateObj &&
        supportsFeature(stateObj, CAMERA_SUPPORT_STREAM) &&
        // The stream component for HLS streams supports a server-side pre-load
        // option that client initiated WebRTC streams do not
        stateObj.attributes.frontend_stream_type === STREAM_TYPE_HLS
      ) {
        this._fetchCameraPrefs();
      }
    }

    if (domain === "number" || domain === "sensor") {
      const stateObj: HassEntity | undefined =
        this.hass.states[this.entry.entity_id];
      this._unit_of_measurement = stateObj?.attributes?.unit_of_measurement;
    }

    if (domain === "sensor") {
      this._precision = this.entry.options?.sensor?.display_precision;
    }

    if (domain === "weather") {
      const stateObj: HassEntity | undefined =
        this.hass.states[this.entry.entity_id];
      this._precipitation_unit = stateObj?.attributes?.precipitation_unit;
      this._pressure_unit = stateObj?.attributes?.pressure_unit;
      this._temperature_unit = stateObj?.attributes?.temperature_unit;
      this._visibility_unit = stateObj?.attributes?.visibility_unit;
      this._wind_speed_unit = stateObj?.attributes?.wind_speed_unit;
    }

    const deviceClasses: string[][] = OVERRIDE_DEVICE_CLASSES[domain];

    if (!deviceClasses) {
      return;
    }

    this._deviceClassOptions = [[], []];
    for (const deviceClass of deviceClasses) {
      if (deviceClass.includes(this.entry.original_device_class!)) {
        this._deviceClassOptions[0] = deviceClass;
      } else {
        this._deviceClassOptions[1].push(...deviceClass);
      }
    }
  }

  private precisionLabel(precision?: number, stateValue?: string) {
    const stateValueNumber = Number(stateValue);
    const value = !isNaN(stateValueNumber) ? stateValueNumber : 0;
    return formatNumber(value, this.hass.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }

  protected async updated(changedProps: PropertyValues): Promise<void> {
    if (changedProps.has("_deviceClass")) {
      const domain = computeDomain(this.entry.entity_id);

      if (domain === "number" && this._deviceClass) {
        const { units } = await getNumberDeviceClassConvertibleUnits(
          this.hass,
          this._deviceClass
        );
        this._numberDeviceClassConvertibleUnits = units;
      } else {
        this._numberDeviceClassConvertibleUnits = [];
      }
      if (domain === "sensor" && this._deviceClass) {
        const { units } = await getSensorDeviceClassConvertibleUnits(
          this.hass,
          this._deviceClass
        );
        this._sensorDeviceClassConvertibleUnits = units;
      } else {
        this._sensorDeviceClassConvertibleUnits = [];
      }
    }
    if (changedProps.has("_entityId")) {
      const domain = computeDomain(this.entry.entity_id);

      if (domain === "weather") {
        const { units } = await getWeatherConvertibleUnits(this.hass);
        this._weatherConvertibleUnits = units;
      } else {
        this._weatherConvertibleUnits = undefined;
      }
    }
  }

  protected render() {
    if (this.entry.entity_id !== this._origEntityId) {
      return nothing;
    }
    const stateObj: HassEntity | undefined =
      this.hass.states[this.entry.entity_id];

    const domain = computeDomain(this.entry.entity_id);

    const invalidDomainUpdate = computeDomain(this._entityId.trim()) !== domain;

    const defaultPrecision =
      this.entry.options?.sensor?.suggested_display_precision ?? undefined;

    return html`
      ${!stateObj
        ? html`
            <ha-alert alert-type="warning">
              ${this._device?.disabled_by
                ? html`${this.hass!.localize(
                      "ui.dialogs.entity_registry.editor.device_disabled"
                    )}<mwc-button
                      @click=${this._openDeviceSettings}
                      slot="action"
                    >
                      ${this.hass!.localize(
                        "ui.dialogs.entity_registry.editor.open_device_settings"
                      )}
                    </mwc-button>`
                : this.entry.disabled_by
                ? html`${this.hass!.localize(
                    "ui.dialogs.entity_registry.editor.entity_disabled"
                  )}${["user", "integration"].includes(this._disabledBy!)
                    ? html`<mwc-button
                        slot="action"
                        @click=${this._enableEntry}
                      >
                        ${this.hass!.localize(
                          "ui.dialogs.entity_registry.editor.enable_entity"
                        )}</mwc-button
                      >`
                    : ""}`
                : this.hass!.localize(
                    "ui.dialogs.entity_registry.editor.unavailable"
                  )}
            </ha-alert>
          `
        : ""}
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : ""}
      <div class="form container">
        <ha-textfield
          .value=${this._name}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.name")}
          .invalid=${invalidDomainUpdate}
          .disabled=${this._submitting}
          .placeholder=${this.entry.original_name}
          @input=${this._nameChanged}
        ></ha-textfield>
        <ha-icon-picker
          .hass=${this.hass}
          .value=${this._icon}
          @value-changed=${this._iconChanged}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.icon")}
          .placeholder=${this.entry.original_icon || stateObj?.attributes.icon}
          .fallbackPath=${!this._icon && !stateObj?.attributes.icon && stateObj
            ? domainIcon(computeDomain(stateObj.entity_id), {
                ...stateObj,
                attributes: {
                  ...stateObj.attributes,
                  device_class: this._deviceClass,
                },
              })
            : undefined}
          .disabled=${this._submitting}
        ></ha-icon-picker>
        ${this._deviceClassOptions
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.device_class"
                )}
                .value=${this._deviceClass}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._deviceClassChanged}
                @closed=${stopPropagation}
              >
                <mwc-list-item></mwc-list-item>
                ${this._deviceClassesSorted(
                  domain,
                  this._deviceClassOptions[0],
                  this.hass.localize
                ).map(
                  (entry) => html`
                    <mwc-list-item .value=${entry.deviceClass}>
                      ${entry.label}
                    </mwc-list-item>
                  `
                )}
                ${this._deviceClassOptions[0].length &&
                this._deviceClassOptions[1].length
                  ? html`<li divider role="separator"></li>`
                  : ""}
                ${this._deviceClassesSorted(
                  domain,
                  this._deviceClassOptions[1],
                  this.hass.localize
                ).map(
                  (entry) => html`
                    <mwc-list-item .value=${entry.deviceClass}>
                      ${entry.label}
                    </mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
        ${domain === "number" &&
        this._deviceClass &&
        stateObj?.attributes.unit_of_measurement &&
        this._numberDeviceClassConvertibleUnits?.includes(
          stateObj?.attributes.unit_of_measurement
        )
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.unit_of_measurement"
                )}
                .value=${stateObj.attributes.unit_of_measurement}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._unitChanged}
                @closed=${stopPropagation}
              >
                ${this._numberDeviceClassConvertibleUnits.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
        ${domain === "sensor" &&
        this._deviceClass &&
        stateObj?.attributes.unit_of_measurement &&
        this._sensorDeviceClassConvertibleUnits?.includes(
          stateObj?.attributes.unit_of_measurement
        )
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.unit_of_measurement"
                )}
                .value=${stateObj.attributes.unit_of_measurement}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._unitChanged}
                @closed=${stopPropagation}
              >
                ${this._sensorDeviceClassConvertibleUnits.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
        ${domain === "sensor" &&
        // Allow customizing the precision for a sensor with numerical device class,
        // a unit of measurement or state class
        ((this._deviceClass &&
          !["date", "enum", "timestamp"].includes(this._deviceClass)) ||
          stateObj?.attributes.unit_of_measurement ||
          stateObj?.attributes.state_class)
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.precision"
                )}
                .value=${this._precision == null
                  ? "default"
                  : this._precision.toString()}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._precisionChanged}
                @closed=${stopPropagation}
              >
                <mwc-list-item value="default"
                  >${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.precision_default",
                    {
                      value: this.precisionLabel(
                        defaultPrecision,
                        stateObj?.state
                      ),
                    }
                  )}</mwc-list-item
                >
                ${PRECISIONS.map(
                  (precision) => html`
                    <mwc-list-item .value=${precision.toString()}>
                      ${this.precisionLabel(precision, stateObj?.state)}
                    </mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
        ${domain === "weather"
          ? html`
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.precipitation_unit"
                )}
                .value=${this._precipitation_unit}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._precipitationUnitChanged}
                @closed=${stopPropagation}
              >
                ${this._weatherConvertibleUnits?.precipitation_unit.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.pressure_unit"
                )}
                .value=${this._pressure_unit}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._pressureUnitChanged}
                @closed=${stopPropagation}
              >
                ${this._weatherConvertibleUnits?.pressure_unit.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.temperature_unit"
                )}
                .value=${this._temperature_unit}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._temperatureUnitChanged}
                @closed=${stopPropagation}
              >
                ${this._weatherConvertibleUnits?.temperature_unit.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.visibility_unit"
                )}
                .value=${this._visibility_unit}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._visibilityUnitChanged}
                @closed=${stopPropagation}
              >
                ${this._weatherConvertibleUnits?.visibility_unit.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
              <ha-select
                .label=${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.wind_speed_unit"
                )}
                .value=${this._wind_speed_unit}
                naturalMenuWidth
                fixedMenuPosition
                @selected=${this._windSpeedUnitChanged}
                @closed=${stopPropagation}
              >
                ${this._weatherConvertibleUnits?.wind_speed_unit.map(
                  (unit: string) => html`
                    <mwc-list-item .value=${unit}>${unit}</mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
        ${domain === "switch"
          ? html`<ha-select
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.device_class"
              )}
              naturalMenuWidth
              fixedMenuPosition
              @selected=${this._switchAsChanged}
              @closed=${stopPropagation}
            >
              <mwc-list-item
                value="switch"
                .selected=${!this._deviceClass ||
                this._deviceClass === "switch"}
              >
                ${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.device_classes.switch.switch"
                )}
              </mwc-list-item>
              <mwc-list-item
                value="outlet"
                .selected=${this._deviceClass === "outlet"}
              >
                ${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.device_classes.switch.outlet"
                )}
              </mwc-list-item>
              <li divider role="separator"></li>
              ${this._switchAsDomainsSorted(
                SWITCH_AS_DOMAINS,
                this.hass.localize
              ).map(
                (entry) => html`
                  <mwc-list-item .value=${entry.domain}>
                    ${entry.label}
                  </mwc-list-item>
                `
              )}
            </ha-select>`
          : ""}
        ${this._helperConfigEntry
          ? html`
              <div class="row">
                <mwc-button
                  @click=${this._showOptionsFlow}
                  .disabled=${this._submitting}
                >
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.configure_state",
                    "integration",
                    domainToName(
                      this.hass.localize,
                      this._helperConfigEntry.domain
                    )
                  )}
                </mwc-button>
              </div>
            `
          : ""}
        <ha-textfield
          error-message="Domain needs to stay the same"
          .value=${this._entityId}
          .label=${this.hass.localize(
            "ui.dialogs.entity_registry.editor.entity_id"
          )}
          .invalid=${invalidDomainUpdate}
          .disabled=${this._submitting}
          @input=${this._entityIdChanged}
        ></ha-textfield>
        ${!this.entry.device_id
          ? html`<ha-area-picker
              .hass=${this.hass}
              .value=${this._areaId}
              @value-changed=${this._areaPicked}
            ></ha-area-picker>`
          : ""}
        ${this._cameraPrefs
          ? html`
              <ha-settings-row>
                <span slot="heading"
                  >${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.stream.preload_stream"
                  )}</span
                >
                <span slot="description"
                  >${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.stream.preload_stream_description"
                  )}</span
                >
                <ha-switch
                  .checked=${this._cameraPrefs.preload_stream}
                  @change=${this._handleCameraPrefsChanged}
                >
                </ha-switch>
              </ha-settings-row>
              <ha-settings-row>
                <span slot="heading"
                  >${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.stream.stream_orientation"
                  )}</span
                >
                <span slot="description"
                  >${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.stream.stream_orientation_description"
                  )}</span
                >
                <ha-select
                  .label=${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.stream.stream_orientation"
                  )}
                  naturalMenuWidth
                  fixedMenuPosition
                  @selected=${this._handleCameraOrientationChanged}
                  @closed=${stopPropagation}
                >
                  ${CAMERA_ORIENTATIONS.map((num) => {
                    const localizeStr =
                      "ui.dialogs.entity_registry.editor.stream.stream_orientation_" +
                      num.toString();
                    return html`
                      <mwc-list-item value=${num}>
                        ${this.hass.localize(localizeStr as LocalizeKeys)}
                      </mwc-list-item>
                    `;
                  })}
                </ha-select>
              </ha-settings-row>
            `
          : ""}
        <ha-expansion-panel
          .header=${this.hass.localize(
            "ui.dialogs.entity_registry.editor.advanced"
          )}
          outlined
        >
          <div class="label">
            ${this.hass.localize(
              "ui.dialogs.entity_registry.editor.entity_status"
            )}
          </div>
          <div class="secondary">
            ${this._disabledBy &&
            this._disabledBy !== "user" &&
            this._disabledBy !== "integration"
              ? this.hass.localize(
                  "ui.dialogs.entity_registry.editor.enabled_cause",
                  "cause",
                  this.hass.localize(
                    `config_entry.disabled_by.${this._disabledBy}`
                  )
                )
              : ""}
          </div>
          <div class="row">
            <mwc-formfield
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.enabled_label"
              )}
            >
              <ha-radio
                name="hiddendisabled"
                value="enabled"
                .checked=${!this._hiddenBy && !this._disabledBy}
                .disabled=${(this._hiddenBy !== null &&
                  this._hiddenBy !== "user") ||
                !!this._device?.disabled_by ||
                (this._disabledBy !== null &&
                  this._disabledBy !== "user" &&
                  this._disabledBy !== "integration")}
                @change=${this._viewStatusChanged}
              ></ha-radio>
            </mwc-formfield>
            <mwc-formfield
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.hidden_label"
              )}
            >
              <ha-radio
                name="hiddendisabled"
                value="hidden"
                .checked=${this._hiddenBy !== null}
                .disabled=${(this._hiddenBy && this._hiddenBy !== "user") ||
                Boolean(this._device?.disabled_by) ||
                (this._disabledBy &&
                  this._disabledBy !== "user" &&
                  this._disabledBy !== "integration")}
                @change=${this._viewStatusChanged}
              ></ha-radio>
            </mwc-formfield>
            <mwc-formfield
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.disabled_label"
              )}
            >
              <ha-radio
                name="hiddendisabled"
                value="disabled"
                .checked=${this._disabledBy !== null}
                .disabled=${(this._hiddenBy && this._hiddenBy !== "user") ||
                Boolean(this._device?.disabled_by) ||
                (this._disabledBy &&
                  this._disabledBy !== "user" &&
                  this._disabledBy !== "integration")}
                @change=${this._viewStatusChanged}
              ></ha-radio>
            </mwc-formfield>
          </div>

          ${this._disabledBy !== null
            ? html`
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.enabled_description"
                  )}
                </div>
              `
            : this._hiddenBy !== null
            ? html`
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.hidden_description"
                  )}
                </div>
              `
            : ""}

          <div class="label">
            ${this.hass.localize(
              "ui.dialogs.entity_registry.editor.aliases_section"
            )}
          </div>
          <mwc-list class="aliases" @action=${this._handleAliasesClicked}>
            <mwc-list-item .twoline=${this.entry.aliases.length > 0} hasMeta>
              <span>
                ${this.entry.aliases.length > 0
                  ? this.hass.localize(
                      "ui.dialogs.entity_registry.editor.configured_aliases",
                      { count: this.entry.aliases.length }
                    )
                  : this.hass.localize(
                      "ui.dialogs.entity_registry.editor.no_aliases"
                    )}
              </span>
              <span slot="secondary">
                ${[...this.entry.aliases]
                  .sort((a, b) =>
                    stringCompare(a, b, this.hass.locale.language)
                  )
                  .join(", ")}
              </span>
              <ha-svg-icon slot="meta" .path=${mdiPencil}></ha-svg-icon>
            </mwc-list-item>
          </mwc-list>
          <div class="secondary">
            ${this.hass.localize(
              "ui.dialogs.entity_registry.editor.aliases_description"
            )}
          </div>
          ${this.entry.device_id
            ? html`
                <div class="label">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.change_area"
                  )}
                </div>
                <ha-area-picker
                  .hass=${this.hass}
                  .value=${this._areaId}
                  .placeholder=${this._device?.area_id}
                  .label=${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.area"
                  )}
                  @value-changed=${this._areaPicked}
                ></ha-area-picker>
                <div class="secondary">
                  ${this.hass.localize(
                    "ui.dialogs.entity_registry.editor.area_note"
                  )}
                  ${this._device
                    ? html`
                        <button class="link" @click=${this._openDeviceSettings}>
                          ${this.hass.localize(
                            "ui.dialogs.entity_registry.editor.change_device_area"
                          )}
                        </button>
                      `
                    : ""}
                </div>
              `
            : ""}
        </ha-expansion-panel>
      </div>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click=${this._confirmDeleteEntry}
          .disabled=${this._submitting ||
          (!this._helperConfigEntry && !stateObj?.attributes.restored)}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.delete")}
        </mwc-button>
        <mwc-button
          @click=${this._updateEntry}
          .disabled=${invalidDomainUpdate || this._submitting}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.update")}
        </mwc-button>
      </div>
    `;
  }

  private _nameChanged(ev): void {
    this._error = undefined;
    this._name = ev.target.value;
  }

  private _iconChanged(ev: CustomEvent): void {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private _entityIdChanged(ev): void {
    this._error = undefined;
    this._entityId = ev.target.value;
  }

  private _deviceClassChanged(ev): void {
    this._error = undefined;
    this._deviceClass = ev.target.value;
  }

  private _unitChanged(ev): void {
    this._error = undefined;
    this._unit_of_measurement = ev.target.value;
  }

  private _precipitationUnitChanged(ev): void {
    this._error = undefined;
    this._precipitation_unit = ev.target.value;
  }

  private _precisionChanged(ev): void {
    this._error = undefined;
    this._precision =
      ev.target.value === "default" ? null : Number(ev.target.value);
  }

  private _pressureUnitChanged(ev): void {
    this._error = undefined;
    this._pressure_unit = ev.target.value;
  }

  private _temperatureUnitChanged(ev): void {
    this._error = undefined;
    this._temperature_unit = ev.target.value;
  }

  private _visibilityUnitChanged(ev): void {
    this._error = undefined;
    this._visibility_unit = ev.target.value;
  }

  private _windSpeedUnitChanged(ev): void {
    this._error = undefined;
    this._wind_speed_unit = ev.target.value;
  }

  private _switchAsChanged(ev): void {
    if (ev.target.value === "") {
      return;
    }

    // If value is "outlet" that means the user kept the "switch" domain, but actually changed
    // the device_class of the switch to "outlet".
    const switchAs = ev.target.value === "outlet" ? "switch" : ev.target.value;
    this._switchAs = switchAs;

    if (ev.target.value === "outlet" || ev.target.value === "switch") {
      this._deviceClass = ev.target.value;
    }
  }

  private _areaPicked(ev: CustomEvent) {
    this._error = undefined;
    this._areaId = ev.detail.value;
  }

  private async _fetchCameraPrefs() {
    this._cameraPrefs = await fetchCameraPrefs(this.hass, this.entry.entity_id);
  }

  private async _handleCameraPrefsChanged(ev) {
    const checkbox = ev.currentTarget as HaSwitch;
    try {
      this._cameraPrefs = await updateCameraPrefs(
        this.hass,
        this.entry.entity_id,
        {
          preload_stream: checkbox.checked!,
        }
      );
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
      checkbox.checked = !checkbox.checked;
    }
  }

  private async _handleCameraOrientationChanged(ev) {
    try {
      this._cameraPrefs = await updateCameraPrefs(
        this.hass,
        this.entry.entity_id,
        {
          orientation: ev.currentTarget.value,
        }
      );
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
    }
  }

  private _viewStatusChanged(ev: CustomEvent): void {
    switch ((ev.target as any).value) {
      case "enabled":
        this._disabledBy = null;
        this._hiddenBy = null;
        break;
      case "disabled":
        this._disabledBy = "user";
        this._hiddenBy = null;
        break;
      case "hidden":
        this._hiddenBy = "user";
        this._disabledBy = null;
        break;
    }
  }

  private _openDeviceSettings() {
    showDeviceRegistryDetailDialog(this, {
      device: this._device!,
      updateEntry: async (updates) => {
        await updateDeviceRegistryEntry(this.hass, this._device!.id, updates);
      },
    });
  }

  private _handleAliasesClicked(ev: CustomEvent) {
    if (ev.detail.index !== 0) return;

    const stateObj = this.hass.states[this.entry.entity_id];
    const name =
      (stateObj && computeStateName(stateObj)) || this.entry.entity_id;

    showAliasesDialog(this, {
      name,
      aliases: this.entry!.aliases,
      updateAliases: async (aliases: string[]) => {
        const result = await updateEntityRegistryEntry(
          this.hass,
          this.entry.entity_id,
          { aliases }
        );
        fireEvent(this, "entity-entry-updated", result.entity_entry);
      },
    });
  }

  private async _enableEntry() {
    this._error = undefined;
    this._submitting = true;
    try {
      const result = await updateEntityRegistryEntry(
        this.hass!,
        this._origEntityId,
        { disabled_by: null }
      );
      fireEvent(this, "entity-entry-updated", result.entity_entry);
      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_restart_confirm"
          ),
        });
      }
      if (result.reload_delay) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_delay_confirm",
            "delay",
            result.reload_delay
          ),
        });
      }
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._submitting = false;
    }
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;

    const parent = (this.getRootNode() as ShadowRoot).host as HTMLElement;

    const params: Partial<EntityRegistryEntryUpdateParams> = {
      name: this._name.trim() || null,
      icon: this._icon.trim() || null,
      area_id: this._areaId || null,
      new_entity_id: this._entityId.trim(),
    };

    // Only update device class if changed by user
    if (
      this._deviceClass !==
      (this.entry.device_class || this.entry.original_device_class)
    ) {
      params.device_class = this._deviceClass;
    }

    const stateObj: HassEntity | undefined =
      this.hass.states[this.entry.entity_id];
    const domain = computeDomain(this.entry.entity_id);

    if (
      this.entry.disabled_by !== this._disabledBy &&
      (this._disabledBy === null || this._disabledBy === "user")
    ) {
      params.disabled_by = this._disabledBy;
    }
    if (
      this.entry.hidden_by !== this._hiddenBy &&
      (this._hiddenBy === null || this._hiddenBy === "user")
    ) {
      params.hidden_by = this._hiddenBy;
    }
    if (
      (domain === "number" || domain === "sensor") &&
      stateObj?.attributes?.unit_of_measurement !== this._unit_of_measurement
    ) {
      params.options_domain = domain;
      params.options = this.entry.options?.[domain] || {};
      params.options.unit_of_measurement = this._unit_of_measurement;
    }
    if (
      domain === "sensor" &&
      this.entry.options?.[domain]?.display_precision !== this._precision
    ) {
      params.options_domain = domain;
      params.options = params.options || this.entry.options?.[domain] || {};
      (params.options as SensorEntityOptions).display_precision =
        this._precision;
    }
    if (
      domain === "weather" &&
      (stateObj?.attributes?.precipitation_unit !== this._precipitation_unit ||
        stateObj?.attributes?.pressure_unit !== this._pressure_unit ||
        stateObj?.attributes?.temperature_unit !== this._temperature_unit ||
        stateObj?.attributes?.visbility_unit !== this._visibility_unit ||
        stateObj?.attributes?.wind_speed_unit !== this._wind_speed_unit)
    ) {
      params.options_domain = "weather";
      params.options = {
        precipitation_unit: this._precipitation_unit,
        pressure_unit: this._pressure_unit,
        temperature_unit: this._temperature_unit,
        visibility_unit: this._visibility_unit,
        wind_speed_unit: this._wind_speed_unit,
      };
    }
    try {
      const result = await updateEntityRegistryEntry(
        this.hass!,
        this._origEntityId,
        params
      );
      if (result.require_restart) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_restart_confirm"
          ),
        });
      }
      if (result.reload_delay) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_delay_confirm",
            "delay",
            result.reload_delay
          ),
        });
      }
      fireEvent(this as HTMLElement, "close-dialog");
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }

    if (this._switchAs !== "switch") {
      if (
        !(await showConfirmationDialog(this, {
          text: this.hass!.localize(
            "ui.dialogs.entity_registry.editor.switch_as_x_confirm",
            "domain",
            this._switchAs
          ),
        }))
      ) {
        return;
      }
      const configFlow = await createConfigFlow(this.hass, "switch_as_x");
      const result = (await handleConfigFlowStep(
        this.hass,
        configFlow.flow_id,
        {
          entity_id: this._entityId.trim(),
          target_domain: this._switchAs,
        }
      )) as DataEntryFlowStepCreateEntry;
      if (!result.result?.entry_id) {
        return;
      }
      const unsub = await this.hass.connection.subscribeEvents(() => {
        unsub();
        fetchEntityRegistry(this.hass.connection).then((entityRegistry) => {
          const entity = entityRegistry.find(
            (reg) => reg.config_entry_id === result.result!.entry_id
          );
          if (!entity) {
            return;
          }
          showMoreInfoDialog(parent, { entityId: entity.entity_id });
        });
      }, "entity_registry_updated");
    }
  }

  private async _confirmDeleteEntry(): Promise<void> {
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.entity_registry.editor.confirm_delete"
        ),
      }))
    ) {
      return;
    }

    this._submitting = true;

    try {
      if (this._helperConfigEntry) {
        await deleteConfigEntry(this.hass, this._helperConfigEntry.entry_id);
      } else {
        await removeEntityRegistryEntry(this.hass!, this._origEntityId);
      }
      fireEvent(this, "close-dialog");
    } finally {
      this._submitting = false;
    }
  }

  private async _showOptionsFlow() {
    showOptionsFlowDialog(this, this._helperConfigEntry!, null);
  }

  private _switchAsDomainsSorted = memoizeOne(
    (domains: string[], localize: LocalizeFunc) =>
      domains
        .map((entry) => ({
          domain: entry,
          label: domainToName(localize, entry),
        }))
        .sort((a, b) =>
          stringCompare(a.label, b.label, this.hass.locale.language)
        )
  );

  private _deviceClassesSorted = memoizeOne(
    (domain: string, deviceClasses: string[], localize: LocalizeFunc) =>
      deviceClasses
        .map((entry) => ({
          deviceClass: entry,
          label: localize(
            `ui.dialogs.entity_registry.editor.device_classes.${domain}.${entry}`
          ),
        }))
        .sort((a, b) =>
          stringCompare(a.label, b.label, this.hass.locale.language)
        )
  );

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        .container {
          padding: 8px 24px 20px 24px;
        }
        .buttons {
          box-sizing: border-box;
          display: flex;
          padding: 24px;
          padding-top: 16px;
          justify-content: space-between;
          padding-bottom: max(env(safe-area-inset-bottom), 24px);
          background-color: var(--mdc-theme-surface, #fff);
          border-top: 1px solid var(--divider-color);
          position: sticky;
          bottom: 0px;
        }
        ha-select {
          width: 100%;
          margin: 8px 0;
        }
        ha-switch {
          margin-right: 16px;
        }
        ha-settings-row {
          padding: 0;
        }
        ha-settings-row ha-switch {
          margin-right: 0;
        }
        ha-textfield {
          display: block;
          margin: 8px 0;
        }
        ha-area-picker {
          margin: 8px 0;
          display: block;
        }
        .row {
          margin: 8px 0;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
        .label {
          margin-top: 16px;
        }
        .secondary {
          margin: 8px 0;
        }
        li[divider] {
          border-bottom-color: var(--divider-color);
        }
        ha-alert mwc-button {
          width: max-content;
        }
        .aliases {
          border-radius: 4px;
          margin-top: 4px;
          margin-bottom: 4px;
          --mdc-icon-button-size: 24px;
          overflow: hidden;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-registry-settings": EntityRegistrySettings;
  }
  interface HASSDomEvents {
    "entity-entry-updated": ExtEntityRegistryEntry;
  }
}
