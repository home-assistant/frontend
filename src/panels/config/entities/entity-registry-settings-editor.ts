import "@material/mwc-button/mwc-button";
import "@material/mwc-formfield/mwc-formfield";
import { mdiContentCopy } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeObjectId } from "../../../common/entity/compute_object_id";
import { domainIcon } from "../../../common/entity/domain_icon";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { formatNumber } from "../../../common/number/format_number";
import { stringCompare } from "../../../common/string/compare";
import {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-alert";
import "../../../components/ha-area-picker";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button-next";
import "../../../components/ha-icon-picker";
import "../../../components/ha-list-item";
import "../../../components/ha-radio";
import "../../../components/ha-select";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import "../../../components/ha-textfield";
import {
  CAMERA_ORIENTATIONS,
  CAMERA_SUPPORT_STREAM,
  CameraPreferences,
  fetchCameraPrefs,
  STREAM_TYPE_HLS,
  updateCameraPrefs,
} from "../../../data/camera";
import { ConfigEntry, deleteConfigEntry } from "../../../data/config_entries";
import {
  createConfigFlow,
  handleConfigFlowStep,
} from "../../../data/config_flow";
import { DataEntryFlowStepCreateEntry } from "../../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import {
  EntityRegistryEntry,
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
  LockEntityOptions,
  SensorEntityOptions,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import { getNumberDeviceClassConvertibleUnits } from "../../../data/number";
import {
  getSensorDeviceClassConvertibleUnits,
  getSensorNumericDeviceClasses,
} from "../../../data/sensor";
import {
  getWeatherConvertibleUnits,
  WeatherUnits,
} from "../../../data/weather";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showVoiceAssistantsView } from "../../../dialogs/more-info/components/voice/show-view-voice-assistants";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
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

@customElement("entity-registry-settings-editor")
export class EntityRegistrySettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public entry!: ExtEntityRegistryEntry;

  @property({ type: Boolean }) public hideName = false;

  @property({ type: Boolean }) public hideIcon = false;

  @property({ type: Boolean }) public disabled = false;

  @property() public helperConfigEntry?: ConfigEntry;

  @state() private _name!: string;

  @state() private _icon!: string;

  @state() private _entityId!: string;

  @state() private _deviceClass?: string;

  @state() private _switchAs = "switch";

  @state() private _areaId?: string | null;

  @state() private _disabledBy!: EntityRegistryEntry["disabled_by"];

  @state() private _hiddenBy!: EntityRegistryEntry["hidden_by"];

  @state() private _device?: DeviceRegistryEntry;

  @state() private _unit_of_measurement?: string | null;

  @state() private _precision?: number | null;

  @state() private _precipitation_unit?: string | null;

  @state() private _pressure_unit?: string | null;

  @state() private _temperature_unit?: string | null;

  @state() private _visibility_unit?: string | null;

  @state() private _wind_speed_unit?: string | null;

  @state() private _cameraPrefs?: CameraPreferences;

  @state() private _numberDeviceClassConvertibleUnits?: string[];

  @state() private _sensorDeviceClassConvertibleUnits?: string[];

  @state() private _sensorNumericalDeviceClasses?: string[];

  @state() private _weatherConvertibleUnits?: WeatherUnits;

  @state() private _defaultCode?: string | null;

  @state() private _noDeviceArea?: boolean;

  private _origEntityId!: string;

  private _deviceClassOptions?: string[][];

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (
      !changedProperties.has("entry") ||
      changedProperties.get("entry")?.id === this.entry.id
    ) {
      return;
    }

    this._name = this.entry.name || "";
    this._icon = this.entry.icon || "";
    this._deviceClass =
      this.entry.device_class || this.entry.original_device_class;
    this._origEntityId = this.entry.entity_id;
    this._areaId = this.entry.area_id;
    this._entityId = this.entry.entity_id;
    this._disabledBy = this.entry.disabled_by;
    this._hiddenBy = this.entry.hidden_by;
    this._device = this.entry.device_id
      ? this.hass.devices[this.entry.device_id]
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

    if (domain === "lock") {
      this._defaultCode = this.entry.options?.lock?.default_code;
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
    const value = !isNaN(stateValueNumber) ? stateValue! : 0;
    return formatNumber(value, this.hass.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }

  private _isInvalidDefaultCode(
    codeFormat?: string,
    value?: string | null
  ): boolean {
    if (codeFormat && value) {
      return !RegExp(codeFormat).test(value);
    }
    return false;
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
      if (domain === "sensor") {
        const { numeric_device_classes } = await getSensorNumericDeviceClasses(
          this.hass
        );
        this._sensorNumericalDeviceClasses = numeric_device_classes;
      } else {
        this._sensorNumericalDeviceClasses = [];
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
    if (changedProps.has("helperConfigEntry")) {
      if (this.helperConfigEntry?.domain === "switch_as_x") {
        this._switchAs = computeDomain(this.entry.entity_id);
      } else {
        this._switchAs = "switch";
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

    const invalidDefaultCode =
      domain === "lock" &&
      this._isInvalidDefaultCode(
        stateObj?.attributes?.code_format,
        this._defaultCode
      );

    const defaultPrecision =
      this.entry.options?.sensor?.suggested_display_precision ?? undefined;

    return html`
      ${this.hideName
        ? nothing
        : html`<ha-textfield
            .value=${this._name}
            .label=${this.hass.localize(
              "ui.dialogs.entity_registry.editor.name"
            )}
            .disabled=${this.disabled}
            .placeholder=${this.entry.original_name}
            @input=${this._nameChanged}
          ></ha-textfield>`}
      ${this.hideIcon
        ? nothing
        : html`<ha-icon-picker
            .hass=${this.hass}
            .value=${this._icon}
            @value-changed=${this._iconChanged}
            .label=${this.hass.localize(
              "ui.dialogs.entity_registry.editor.icon"
            )}
            .placeholder=${this.entry.original_icon ||
            stateObj?.attributes.icon}
            .fallbackPath=${!this._icon &&
            !stateObj?.attributes.icon &&
            stateObj
              ? domainIcon(computeDomain(stateObj.entity_id), {
                  ...stateObj,
                  attributes: {
                    ...stateObj.attributes,
                    device_class: this._deviceClass,
                  },
                })
              : undefined}
            .disabled=${this.disabled}
          ></ha-icon-picker>`}
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
            <ha-list-item
              value="switch"
              .selected=${!this._deviceClass || this._deviceClass === "switch"}
            >
              ${domainToName(this.hass.localize, "switch")}
            </ha-list-item>
            <ha-list-item
              value="outlet"
              .selected=${this._deviceClass === "outlet"}
            >
              ${this.hass.localize(
                "ui.dialogs.entity_registry.editor.device_classes.switch.outlet"
              )}
            </ha-list-item>
            <li divider role="separator"></li>
            ${this._switchAsDomainsSorted(
              SWITCH_AS_DOMAINS,
              this.hass.localize
            ).map(
              (entry) => html`
                <ha-list-item .value=${entry.domain}>
                  ${entry.label}
                </ha-list-item>
              `
            )}
          </ha-select>`
        : this.helperConfigEntry?.domain === "switch_as_x"
        ? html`<ha-select
            .label=${this.hass.localize(
              "ui.dialogs.entity_registry.editor.switch_as_x"
            )}
            .value=${this._switchAs}
            naturalMenuWidth
            fixedMenuPosition
            @selected=${this._switchAsChanged}
            @closed=${stopPropagation}
          >
            <ha-list-item value="switch">
              ${domainToName(this.hass.localize, "switch")}
            </ha-list-item>
            <ha-list-item .value=${domain}>
              ${domainToName(this.hass.localize, domain)}
            </ha-list-item>
            <li divider role="separator"></li>
            ${this._switchAsDomainsSorted(
              SWITCH_AS_DOMAINS,
              this.hass.localize
            ).map((entry) =>
              domain === entry.domain
                ? nothing
                : html`
                    <ha-list-item .value=${entry.domain}>
                      ${entry.label}
                    </ha-list-item>
                  `
            )}
          </ha-select>`
        : nothing}
      ${this._deviceClassOptions
        ? html`
            <ha-select
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.device_class"
              )}
              .value=${this._deviceClass}
              naturalMenuWidth
              fixedMenuPosition
              clearable
              @selected=${this._deviceClassChanged}
              @closed=${stopPropagation}
            >
              ${this._deviceClassesSorted(
                domain,
                this._deviceClassOptions[0],
                this.hass.localize
              ).map(
                (entry) => html`
                  <ha-list-item .value=${entry.deviceClass}>
                    ${entry.label}
                  </ha-list-item>
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
                  <ha-list-item .value=${entry.deviceClass}>
                    ${entry.label}
                  </ha-list-item>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
                `
              )}
            </ha-select>
          `
        : ""}
      ${domain === "lock"
        ? html`
            <ha-textfield
              .validationMessage=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.default_code_error"
              )}
              .value=${this._defaultCode == null ? "" : this._defaultCode}
              .label=${this.hass.localize(
                "ui.dialogs.entity_registry.editor.default_code"
              )}
              .invalid=${invalidDefaultCode}
              .disabled=${this.disabled}
              @input=${this._defaultcodeChanged}
            ></ha-textfield>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
                `
              )}
            </ha-select>
          `
        : ""}
      ${domain === "sensor" &&
      // Allow customizing the precision for a sensor with numerical device class,
      // a unit of measurement or state class
      ((this._deviceClass &&
        this._sensorNumericalDeviceClasses?.includes(this._deviceClass)) ||
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
              <ha-list-item value="default"
                >${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.precision_default",
                  {
                    value: this.precisionLabel(
                      defaultPrecision,
                      stateObj?.state
                    ),
                  }
                )}</ha-list-item
              >
              ${PRECISIONS.map(
                (precision) => html`
                  <ha-list-item .value=${precision.toString()}>
                    ${this.precisionLabel(precision, stateObj?.state)}
                  </ha-list-item>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
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
                  <ha-list-item .value=${unit}>${unit}</ha-list-item>
                `
              )}
            </ha-select>
          `
        : ""}
      <ha-textfield
        class="entityId"
        .value=${computeObjectId(this._entityId)}
        .prefix=${domain + "."}
        .label=${this.hass.localize(
          "ui.dialogs.entity_registry.editor.entity_id"
        )}
        .disabled=${this.disabled}
        required
        @input=${this._entityIdChanged}
        iconTrailing
        autocapitalize="none"
        autocomplete="off"
        autocorrect="off"
        input-spellcheck="false"
      >
        <ha-icon-button
          @click=${this._copyEntityId}
          slot="trailingIcon"
          .path=${mdiContentCopy}
        ></ha-icon-button>
      </ha-textfield>
      ${!this.entry.device_id
        ? html`<ha-area-picker
            .hass=${this.hass}
            .value=${this._areaId}
            .disabled=${this.disabled}
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
                .disabled=${this.disabled}
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
                .disabled=${this.disabled}
                @selected=${this._handleCameraOrientationChanged}
                @closed=${stopPropagation}
              >
                ${CAMERA_ORIENTATIONS.map((num) => {
                  const localizeStr =
                    "ui.dialogs.entity_registry.editor.stream.stream_orientation_" +
                    num.toString();
                  return html`
                    <ha-list-item value=${num}>
                      ${this.hass.localize(localizeStr as LocalizeKeys)}
                    </ha-list-item>
                  `;
                })}
              </ha-select>
            </ha-settings-row>
          `
        : ""}
      ${this.helperConfigEntry && this.helperConfigEntry.supports_options
        ? html`
            <ha-list-item
              class="menu-item"
              twoline
              hasMeta
              .disabled=${this.disabled}
              @click=${this._showOptionsFlow}
            >
              <span
                >${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.configure_state",
                  "integration",
                  domainToName(
                    this.hass.localize,
                    this.helperConfigEntry.domain
                  )
                )}</span
              >
              <span slot="secondary"
                >${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.configure_state_secondary",
                  "integration",
                  domainToName(
                    this.hass.localize,
                    this.helperConfigEntry.domain
                  )
                )}</span
              >
              <ha-icon-next slot="meta"></ha-icon-next>
            </ha-list-item>
          `
        : ""}

      <ha-list-item
        class="menu-item"
        twoline
        hasMeta
        .disabled=${this.disabled}
        @click=${this._handleVoiceAssistantsClicked}
      >
        <span
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.voice_assistants"
          )}</span
        >
        <span slot="secondary">
          ${this.entry.aliases.length
            ? [...this.entry.aliases]
                .sort((a, b) => stringCompare(a, b, this.hass.locale.language))
                .join(", ")
            : this.hass.localize(
                "ui.dialogs.entity_registry.editor.no_aliases"
              )}
        </span>
        <ha-icon-next slot="meta"></ha-icon-next>
      </ha-list-item>

      ${this._disabledBy &&
      this._disabledBy !== "user" &&
      this._disabledBy !== "integration"
        ? html`<ha-alert alert-type="warning"
            >${this.hass.localize(
              "ui.dialogs.entity_registry.editor.enabled_cause",
              "cause",
              this.hass.localize(
                `config_entry.disabled_by.${this._disabledBy!}`
              )
            )}</ha-alert
          >`
        : ""}

      <ha-settings-row>
        <span slot="heading"
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_label"
          )}</span
        >
        <span slot="description"
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.enabled_description"
          )}</span
        >
        <ha-switch
          .checked=${!this._disabledBy}
          .disabled=${this.disabled ||
          this._device?.disabled_by ||
          (this._disabledBy &&
            this._disabledBy !== "user" &&
            this._disabledBy !== "integration")}
          @change=${this._enabledChanged}
        ></ha-switch>
      </ha-settings-row>

      ${this._hiddenBy && this._hiddenBy !== "user"
        ? html`<ha-alert alert-type="warning"
            >${this.hass.localize(
              "ui.dialogs.entity_registry.editor.hidden_cause",
              "cause",
              this.hass.localize(`config_entry.hidden_by.${this._hiddenBy!}`)
            )}</ha-alert
          >`
        : ""}

      <ha-settings-row>
        <span slot="heading"
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.visible_label"
          )}</span
        >
        <span slot="description"
          >${this.hass.localize(
            "ui.dialogs.entity_registry.editor.hidden_description"
          )}</span
        >
        <ha-switch
          .checked=${!this._disabledBy && !this._hiddenBy}
          .disabled=${this.disabled ||
          this._disabledBy ||
          (this._hiddenBy && this._hiddenBy !== "user")}
          @change=${this._hiddenChanged}
        ></ha-switch>
      </ha-settings-row>

      ${this.entry.device_id
        ? html`<ha-settings-row>
              <span slot="heading"
                >${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.use_device_area"
                )}
                ${this.hass.devices[this.entry.device_id].area_id
                  ? `(${this.hass.areas[
                      this.hass.devices[this.entry.device_id].area_id!
                    ]?.name})`
                  : ""}</span
              >
              <span slot="description"
                >${this.hass.localize(
                  "ui.dialogs.entity_registry.editor.change_device_settings",
                  {
                    link: html`<button
                      class="link"
                      @click=${this._openDeviceSettings}
                    >
                      ${this.hass.localize(
                        "ui.dialogs.entity_registry.editor.change_device_area_link"
                      )}
                    </button>`,
                  }
                )}</span
              >
              <ha-switch
                .checked=${!this._areaId || this._noDeviceArea}
                .disabled=${this.disabled}
                @change=${this._useDeviceAreaChanged}
              >
              </ha-switch
            ></ha-settings-row>
            ${this._areaId || this._noDeviceArea
              ? html`<ha-area-picker
                  .hass=${this.hass}
                  .value=${this._areaId}
                  .placeholder=${this._device?.area_id}
                  .disabled=${this.disabled}
                  @value-changed=${this._areaPicked}
                ></ha-area-picker>`
              : ""} `
        : ""}
    `;
  }

  public async updateEntry(): Promise<{
    close: boolean;
    entry: ExtEntityRegistryEntry;
  }> {
    let close = true;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let parent: HTMLElement = this;
    while (parent?.localName !== "home-assistant") {
      parent = (parent.getRootNode() as ShadowRoot).host as HTMLElement;
    }

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
      domain === "lock" &&
      this.entry.options?.[domain]?.default_code !== this._defaultCode
    ) {
      params.options_domain = domain;
      params.options = this.entry.options?.[domain] || {};
      (params.options as LockEntityOptions).default_code = this._defaultCode;
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

    const result = await updateEntityRegistryEntry(
      this.hass!,
      this.entry.entity_id,
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

    if (domain === "switch" && this._switchAs !== "switch") {
      // generate config flow for switch_as_x
      if (
        await showConfirmationDialog(this, {
          text: this.hass!.localize(
            "ui.dialogs.entity_registry.editor.switch_as_x_confirm",
            {
              domain: domainToName(
                this.hass.localize,
                this._switchAs
              ).toLowerCase(),
            }
          ),
        })
      ) {
        const configFlow = await createConfigFlow(this.hass, "switch_as_x");
        const configFlowResult = (await handleConfigFlowStep(
          this.hass,
          configFlow.flow_id,
          {
            entity_id: this._entityId.trim(),
            target_domain: this._switchAs,
          }
        )) as DataEntryFlowStepCreateEntry;
        if (configFlowResult.result?.entry_id) {
          try {
            const entry = await this._waitForEntityRegistryUpdate(
              configFlowResult.result.entry_id
            );
            showMoreInfoDialog(parent, { entityId: entry.entity_id });
            close = false;
          } catch (err) {
            // ignore
          }
        }
      }
    } else if (
      this.helperConfigEntry?.domain === "switch_as_x" &&
      this._switchAs !== domain
    ) {
      // change a current switch as x to something else
      if (
        await showConfirmationDialog(this, {
          text:
            this._switchAs === "switch"
              ? this.hass!.localize(
                  "ui.dialogs.entity_registry.editor.switch_as_x_remove_confirm",
                  {
                    domain: domainToName(
                      this.hass.localize,
                      domain
                    ).toLowerCase(),
                  }
                )
              : this.hass!.localize(
                  "ui.dialogs.entity_registry.editor.switch_as_x_change_confirm",
                  {
                    domain_1: domainToName(
                      this.hass.localize,
                      domain
                    ).toLowerCase(),
                    domain_2: domainToName(
                      this.hass.localize,
                      this._switchAs
                    ).toLowerCase(),
                  }
                ),
        })
      ) {
        const origEntityId = this.entry.options?.switch_as_x?.entity_id;
        // remove current helper
        await deleteConfigEntry(this.hass, this.helperConfigEntry.entry_id);

        if (!origEntityId) {
          // should not happen, guard for types
        } else if (this._switchAs === "switch") {
          // done, original switch is back
          showMoreInfoDialog(parent, { entityId: origEntityId });
          close = false;
        } else {
          const configFlow = await createConfigFlow(this.hass, "switch_as_x");
          const configFlowResult = (await handleConfigFlowStep(
            this.hass,
            configFlow.flow_id,
            {
              entity_id: origEntityId,
              target_domain: this._switchAs,
            }
          )) as DataEntryFlowStepCreateEntry;
          if (configFlowResult.result?.entry_id) {
            try {
              const entry = await this._waitForEntityRegistryUpdate(
                configFlowResult.result.entry_id
              );
              showMoreInfoDialog(parent, { entityId: entry.entity_id });
              close = false;
            } catch (err) {
              // ignore
            }
          }
        }
      }
    }

    return { close, entry: result.entity_entry };
  }

  private async _waitForEntityRegistryUpdate(config_entry_id: string) {
    return new Promise<EntityRegistryEntry>((resolve, reject) => {
      const timeout = setTimeout(reject, 5000);
      const unsub = subscribeEntityRegistry(
        this.hass.connection,
        (entityRegistry) => {
          const entity = entityRegistry.find(
            (reg) => reg.config_entry_id === config_entry_id
          );
          if (entity) {
            clearTimeout(timeout);
            unsub();
            resolve(entity);
          }
        }
      );
      // @ts-ignore Force refresh
      this.hass.connection._entityRegistry?.refresh();
    });
  }

  private _nameChanged(ev): void {
    fireEvent(this, "change");
    this._name = ev.target.value;
  }

  private _iconChanged(ev: CustomEvent): void {
    fireEvent(this, "change");
    this._icon = ev.detail.value;
  }

  private async _copyEntityId(): Promise<void> {
    await copyToClipboard(this._entityId);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _entityIdChanged(ev): void {
    fireEvent(this, "change");
    this._entityId = `${computeDomain(this._origEntityId)}.${ev.target.value}`;
  }

  private _deviceClassChanged(ev): void {
    fireEvent(this, "change");
    this._deviceClass = ev.target.value;
  }

  private _unitChanged(ev): void {
    fireEvent(this, "change");
    this._unit_of_measurement = ev.target.value;
  }

  private _defaultcodeChanged(ev): void {
    fireEvent(this, "change");
    this._defaultCode = ev.target.value === "" ? null : ev.target.value;
  }

  private _precipitationUnitChanged(ev): void {
    fireEvent(this, "change");
    this._precipitation_unit = ev.target.value;
  }

  private _precisionChanged(ev): void {
    fireEvent(this, "change");
    this._precision =
      ev.target.value === "default" ? null : Number(ev.target.value);
  }

  private _pressureUnitChanged(ev): void {
    fireEvent(this, "change");
    this._pressure_unit = ev.target.value;
  }

  private _temperatureUnitChanged(ev): void {
    fireEvent(this, "change");
    this._temperature_unit = ev.target.value;
  }

  private _visibilityUnitChanged(ev): void {
    fireEvent(this, "change");
    this._visibility_unit = ev.target.value;
  }

  private _windSpeedUnitChanged(ev): void {
    fireEvent(this, "change");
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

    if (
      (computeDomain(this.entry.entity_id) === "switch" &&
        ev.target.value === "outlet") ||
      ev.target.value === "switch"
    ) {
      this._deviceClass = ev.target.value;
    }
  }

  private _useDeviceAreaChanged(ev): void {
    this._noDeviceArea = !ev.target.checked;
    if (!this._noDeviceArea) {
      this._areaId = undefined;
    }
  }

  private _areaPicked(ev: CustomEvent) {
    fireEvent(this, "change");
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

  private _enabledChanged(ev: CustomEvent): void {
    if ((ev.target as any).checked) {
      this._disabledBy = null;
    } else {
      this._disabledBy = "user";
    }
  }

  private _hiddenChanged(ev: CustomEvent): void {
    if ((ev.target as any).checked) {
      this._hiddenBy = null;
    } else {
      this._hiddenBy = "user";
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

  private _handleVoiceAssistantsClicked() {
    showVoiceAssistantsView(
      this,
      this.hass.localize("ui.dialogs.entity_registry.editor.voice_assistants")
    );
  }

  private async _showOptionsFlow() {
    showOptionsFlowDialog(this, this.helperConfigEntry!);
  }

  private _switchAsDomainsSorted = memoizeOne(
    (domains: string[], localize: LocalizeFunc) =>
      domains
        .map((domain) => ({
          domain,
          label: domainToName(localize, domain),
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
        ha-textfield.entityId {
          --text-field-prefix-padding-right: 0;
          --textfield-icon-trailing-padding: 0;
        }
        ha-textfield.entityId > ha-icon-button {
          position: relative;
          right: -8px;
          --mdc-icon-button-size: 36px;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
          inset-inline-start: initial;
          inset-inline-end: -8px;
          direction: var(--direction);
        }
        ha-switch {
          margin-right: 16px;
        }
        ha-settings-row ha-switch {
          margin-right: 0;
        }
        ha-textfield,
        ha-icon-picker,
        ha-select,
        ha-area-picker {
          display: block;
          margin: 8px 0;
          width: 100%;
        }
        li[divider] {
          border-bottom-color: var(--divider-color);
        }
        ha-alert mwc-button {
          width: max-content;
        }
        .menu-item {
          border-radius: 4px;
          margin-top: 3px;
          margin-bottom: 3px;
          overflow: hidden;
          --mdc-list-side-padding: 13px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-registry-settings-editor": EntityRegistrySettingsEditor;
  }
}
