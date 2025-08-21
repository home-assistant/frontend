import type { PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { mdiFormatColorFill } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import type { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import { hex2rgb, rgb2hex } from "../../../../common/color/convert-color";

interface SettingsData {
  column_span?: number;
  background_type: "none" | "color";
  background_color?: number[];
}

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public viewConfig!: LovelaceViewConfig;

  @state() private _selectorBackgroundType: "none" | "color" = "none";

  private _schema = memoizeOne(
    (maxColumns: number, enableBackground: boolean) =>
      [
        {
          name: "column_span",
          selector: {
            number: {
              min: 1,
              max: maxColumns,
              slider_ticks: true,
            },
          },
        },
        {
          name: "styling",
          type: "expandable",
          flatten: true,
          iconPath: mdiFormatColorFill,
          schema: [
            {
              name: "background_settings",
              flatten: true,
              type: "grid",
              schema: [
                {
                  name: "background_type",
                  required: true,
                  selector: {
                    select: {
                      mode: "dropdown",
                      options: [
                        {
                          value: "none",
                          label: this.hass.localize("ui.common.none"),
                        },
                        {
                          value: "color",
                          label: this.hass.localize(
                            "ui.panel.lovelace.editor.edit_section.settings.background_type_color_option"
                          ),
                        },
                      ],
                    },
                  },
                },
                {
                  name: "background_color",
                  selector: {
                    color_rgb: {},
                  },
                  disabled: !enableBackground,
                },
              ],
            },
          ],
        },
      ] as const satisfies HaFormSchema[]
  );

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    if (this.config.style?.background_color) {
      this._selectorBackgroundType = "color";
    } else {
      this._selectorBackgroundType = "none";
    }
  }

  render() {
    const data: SettingsData = {
      column_span: this.config.column_span || 1,
      background_type: this._selectorBackgroundType,
      background_color: this.config.style?.background_color
        ? hex2rgb(this.config.style?.background_color as any)
        : [],
    };

    const schema = this._schema(
      this.viewConfig.max_columns || 4,
      this._selectorBackgroundType === "color"
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_section.settings.${schema.name}`
    );

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_section.settings.${schema.name}_helper`
    ) || "";

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newData = ev.detail.value as SettingsData;

    this._selectorBackgroundType = newData.background_type;

    const newConfig: LovelaceSectionRawConfig = {
      ...this.config,
      column_span: newData.column_span,
    };

    if (newData.background_type === "color") {
      newConfig.style = {
        ...newConfig.style,
        background_color: rgb2hex(newData.background_color as any),
      };
    } else {
      newConfig.style = {
        ...newConfig.style,
        background_color: undefined,
      };
    }

    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-settings-editor": HuiDialogEditSection;
  }
}
