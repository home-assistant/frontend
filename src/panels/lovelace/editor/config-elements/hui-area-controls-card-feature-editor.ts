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
  AREA_CONTROLS,
  type AreaControlsCardFeatureConfig,
  type LovelaceCardFeatureContext,
} from "../../card-features/types";
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

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: AreaControlsCardFeatureConfig;

  public setConfig(config: AreaControlsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, customizeControls: boolean) =>
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
                    options: AREA_CONTROLS.concat().map((control) => ({
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

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: AreaControlsCardFeatureData = {
      ...this._config,
      customize_controls: this._config.controls !== undefined,
    };

    const schema = this._schema(this.hass.localize, data.customize_controls);

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
      config.controls = AREA_CONTROLS.concat();
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
