import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import {
  assert,
  array,
  assign,
  boolean,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import {
  DEFAULT_ASPECT_RATIO,
  DEVICE_CLASSES,
  TOGGLE_DOMAINS,
  getDevicesInArea,
  getEntitiesByDomain,
} from "../../cards/hui-area-card";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { AreaCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import { SelectOption } from "../../../../data/selector";
import { getSensorNumericDeviceClasses } from "../../../../data/sensor";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../../data/entity_registry";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    area: optional(string()),
    navigation_path: optional(string()),
    theme: optional(string()),
    show_camera: optional(boolean()),
    camera_view: optional(string()),
    aspect_ratio: optional(string()),
    alert_classes: optional(array(string())),
    sensor_classes: optional(array(string())),
  })
);

@customElement("hui-area-card-editor")
export class HuiAreaCardEditor
  extends SubscribeMixin(LitElement)
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AreaCardConfig;

  @state() private _numericDeviceClasses?: string[];

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  private _schema = memoizeOne(
    (
      showCamera: boolean,
      binaryClasses: SelectOption[],
      sensorClasses: SelectOption[]
    ) =>
      [
        { name: "area", selector: { area: {} } },
        { name: "show_camera", required: false, selector: { boolean: {} } },
        ...(showCamera
          ? ([
              {
                name: "camera_view",
                selector: { select: { options: ["auto", "live"] } },
              },
            ] as const)
          : []),
        {
          name: "",
          type: "grid",
          schema: [
            {
              name: "navigation_path",
              required: false,
              selector: { navigation: {} },
            },
            { name: "theme", required: false, selector: { theme: {} } },
            {
              name: "aspect_ratio",
              default: DEFAULT_ASPECT_RATIO,
              selector: { text: {} },
            },
          ],
        },
        {
          name: "alert_classes",
          selector: {
            select: {
              reorder: true,
              multiple: true,
              custom_value: true,
              options: binaryClasses,
            },
          },
        },
        {
          name: "sensor_classes",
          selector: {
            select: {
              reorder: true,
              multiple: true,
              custom_value: true,
              options: sensorClasses,
            },
          },
        },
      ] as const
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass!.connection, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass!.connection, (entries) => {
        this._entities = entries;
      }),
    ];
  }

  private _binaryClassesForArea = memoizeOne(
    (entities): string[] =>
      entities.binary_sensor
        ?.map((e) => e.attributes.device_class)
        .filter((deviceClass) => deviceClass !== undefined) || []
  );

  private _sensorClassesForArea = memoizeOne(
    (numericDeviceClasses: string[], entities): string[] =>
      entities.sensor
        ?.map((e) => e.attributes.device_class)
        .filter((deviceClass) => numericDeviceClasses.includes(deviceClass)) ||
      []
  );

  private _buildBinaryOptions = memoizeOne(
    (possibleClasses: string[], currentClasses: string[]): SelectOption[] =>
      this._buildOptions("binary_sensor", possibleClasses, currentClasses)
  );

  private _buildSensorOptions = memoizeOne(
    (possibleClasses: string[], currentClasses: string[]): SelectOption[] =>
      this._buildOptions("sensor", possibleClasses, currentClasses)
  );

  private _buildOptions(
    domain: "sensor" | "binary_sensor",
    possibleClasses: string[],
    currentClasses: string[]
  ): SelectOption[] {
    const options = [...new Set([...possibleClasses, ...currentClasses])].map(
      (deviceClass) => ({
        value: deviceClass,
        label:
          this.hass!.localize(
            `component.${domain}.entity_component.${deviceClass}.name`
          ) || deviceClass,
      })
    );
    options.sort((a, b) =>
      caseInsensitiveStringCompare(a.label, b.label, this.hass!.locale.language)
    );

    return options;
  }

  public setConfig(config: AreaCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected async updated() {
    if (this.hass && !this._numericDeviceClasses) {
      const { numeric_device_classes: sensorNumericDeviceClasses } =
        await getSensorNumericDeviceClasses(this.hass);
      this._numericDeviceClasses = sensorNumericDeviceClasses;
    }
  }

  protected render() {
    if (!this.hass || !this._config || !this._entities) {
      return nothing;
    }

    const _entities = getEntitiesByDomain(
      this._config!.area,
      getDevicesInArea(this._config!.area, this._devices!),
      this._entities!,
      undefined,
      this.hass.states
    );

    const possibleBinaryClasses = this._binaryClassesForArea(_entities);

    const possibleSensorClasses = this._sensorClassesForArea(
      this._numericDeviceClasses || [],
      _entities
    );
    const binarySelectOptions = this._buildBinaryOptions(
      possibleBinaryClasses,
      this._config.alert_classes || DEVICE_CLASSES.binary_sensor
    );
    const sensorSelectOptions = this._buildSensorOptions(
      possibleSensorClasses,
      this._config.sensor_classes || DEVICE_CLASSES.sensor
    );

    const schema = this._schema(
      this._config.show_camera || false,
      binarySelectOptions,
      sensorSelectOptions
    );

    const data = {
      camera_view: "auto",
      alert_classes: DEVICE_CLASSES.binary_sensor,
      sensor_classes: DEVICE_CLASSES.sensor,
      ...this._config,
    };

    const observeList: TemplateResult[] = [];
    data.alert_classes.forEach((alertClass) => {
      const list = (_entities.binary_sensor || [])
        .filter((e) => alertClass === e.attributes.device_class)
        .map((e) => html`<li>${e.entity_id}</li>`);
      if (!list.length) {
        return;
      }
      observeList.push(
        html`<h4>
            ${this.hass!.localize(
              `component.binary_sensor.entity_component.${alertClass}.name`
            ) || alertClass}:
          </h4>
          <ul>
            ${list}
          </ul>`
      );
    });
    data.sensor_classes.forEach((sensorClass) => {
      const list = (_entities.sensor || [])
        .filter((e) => sensorClass === e.attributes.device_class)
        .map((e) => html`<li>${e.entity_id}</li>`);
      if (!list.length) {
        return;
      }
      observeList.push(
        html`<h4>
            ${this.hass!.localize(
              `component.sensor.entity_component.${sensorClass}.name`
            ) || sensorClass}:
          </h4>
          <ul>
            ${list}
          </ul>`
      );
    });

    const controlList: TemplateResult[] = [];
    Object.keys(_entities)
      .filter((domain) => TOGGLE_DOMAINS.includes(domain))
      .forEach((domain) => {
        const list = _entities[domain].map(
          (e) => html`<li>${e.entity_id}</li>`
        );
        controlList.push(
          html`<h4>
              ${this.hass!.localize(
                `component.${domain}.entity_component._.name`
              ) || domain}:
            </h4>
            <ul>
              ${list}
            </ul>`
        );
      });

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <h3>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.card.area.observed_entities"
        )}:
      </h3>
      ${observeList}
      <h3>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.card.area.controlled_entities"
        )}:
      </h3>
      ${controlList}
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value;
    if (!config.show_camera) {
      delete config.camera_view;
    }
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "theme":
        return `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`;
      case "area":
        return this.hass!.localize("ui.panel.lovelace.editor.card.area.name");
      case "navigation_path":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.action-editor.navigation_path"
        );
      case "aspect_ratio":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.aspect_ratio"
        );
      case "camera_view":
        return this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.camera_view"
        );
    }
    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.area.${schema.name}`
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-card-editor": HuiAreaCardEditor;
  }
}
