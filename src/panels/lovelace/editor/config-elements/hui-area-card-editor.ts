import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
} from "../../cards/hui-area-card";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type { AreaCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import { SelectOption } from "../../../../data/selector";
import { getSensorNumericDeviceClasses } from "../../../../data/sensor";

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
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: AreaCardConfig;

  @state() private _numericDeviceClasses?: string[];

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

  private _binaryClassesForArea = memoizeOne((area: string): string[] =>
    this._classesForArea(area, "binary_sensor")
  );

  private _sensorClassesForArea = memoizeOne(
    (area: string, numericDeviceClasses?: string[]): string[] =>
      this._classesForArea(area, "sensor", numericDeviceClasses)
  );

  private _classesForArea(
    area: string,
    domain: "sensor" | "binary_sensor",
    numericDeviceClasses?: string[] | undefined
  ): string[] {
    const entities = Object.values(this.hass!.entities).filter(
      (e) =>
        computeDomain(e.entity_id) === domain &&
        !e.entity_category &&
        !e.hidden &&
        (e.area_id === area ||
          (e.device_id && this.hass!.devices[e.device_id].area_id === area))
    );

    const classes = entities
      .map((e) => this.hass!.states[e.entity_id]?.attributes.device_class || "")
      .filter(
        (c) =>
          c &&
          (domain !== "sensor" ||
            !numericDeviceClasses ||
            numericDeviceClasses.includes(c))
      );

    return [...new Set(classes)];
  }

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
    if (!this.hass || !this._config) {
      return nothing;
    }

    const possibleBinaryClasses = this._binaryClassesForArea(
      this._config.area || ""
    );
    const possibleSensorClasses = this._sensorClassesForArea(
      this._config.area || "",
      this._numericDeviceClasses
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

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
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
