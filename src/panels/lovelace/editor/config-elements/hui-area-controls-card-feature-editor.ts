import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import {
  getAreaControlEntities,
  MAX_DEFAULT_AREA_CONTROLS,
} from "../../card-features/hui-area-controls-card-feature";
import {
  AREA_CONTROLS,
  type AreaControl,
  type AreaControlsCardFeatureConfig,
} from "../../card-features/types";
import type { AreaCardFeatureContext } from "../../cards/hui-area-card";
import type { LovelaceCardFeatureEditor } from "../../types";

type AreaControlsCardFeatureData = AreaControlsCardFeatureConfig & {
  customize_controls: boolean;
};

@customElement("hui-area-controls-card-feature-editor")
export class HuiAreaControlsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: AreaCardFeatureContext;

  @state() private _config?: AreaControlsCardFeatureConfig;

  public setConfig(config: AreaControlsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      customizeControls: boolean,
      compatibleControls: AreaControl[]
    ) =>
      [
        {
          name: "customize_controls",
          selector: {
            boolean: {},
          },
        },
        ...(customizeControls
          ? ([
              {
                name: "controls",
                selector: {
                  select: {
                    reorder: true,
                    multiple: true,
                    options: compatibleControls.map((control) => ({
                      value: control,
                      label: localize(
                        `ui.panel.lovelace.editor.features.types.area-controls.controls_options.${control}`
                      ),
                    })),
                  },
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  private _supportedControls = memoizeOne(
    (
      areaId: string,
      excludeEntities: string[] | undefined,
      // needed to update memoized function when entities, devices or areas change
      _entities: HomeAssistant["entities"],
      _devices: HomeAssistant["devices"],
      _areas: HomeAssistant["areas"]
    ) => {
      if (!this.hass) {
        return [];
      }
      const controlEntities = getAreaControlEntities(
        AREA_CONTROLS as unknown as AreaControl[],
        areaId,
        excludeEntities,
        this.hass!
      );
      return (
        Object.keys(controlEntities) as (keyof typeof controlEntities)[]
      ).filter((control) => controlEntities[control].length > 0);
    }
  );

  protected render() {
    if (!this.hass || !this._config || !this.context?.area_id) {
      return nothing;
    }

    const supportedControls = this._supportedControls(
      this.context.area_id,
      this.context.exclude_entities,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas
    );

    if (supportedControls.length === 0) {
      return html`
        <ha-alert alert-type="warning">
          ${this.hass.localize(
            "ui.panel.lovelace.editor.features.types.area-controls.no_compatible_controls"
          )}
        </ha-alert>
      `;
    }

    const data: AreaControlsCardFeatureData = {
      ...this._config,
      customize_controls: this._config.controls !== undefined,
    };

    const schema = this._schema(
      this.hass.localize,
      data.customize_controls,
      supportedControls
    );

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
    const { customize_controls, ...config } = ev.detail
      .value as AreaControlsCardFeatureData;

    if (customize_controls && !config.controls) {
      config.controls = this._supportedControls(
        this.context!.area_id!,
        this.context!.exclude_entities,
        this.hass!.entities,
        this.hass!.devices,
        this.hass!.areas
      ).slice(0, MAX_DEFAULT_AREA_CONTROLS); // Limit to max default controls
    }

    if (!customize_controls && config.controls) {
      delete config.controls;
    }

    fireEvent(this, "config-changed", { config: config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "controls":
      case "customize_controls":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.area-controls.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-area-controls-card-feature-editor": HuiAreaControlsCardFeatureEditor;
  }
}
