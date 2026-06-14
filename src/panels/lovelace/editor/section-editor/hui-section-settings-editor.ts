import { mdiPalette } from "@mdi/js";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import {
  DEFAULT_SECTION_BACKGROUND_OPACITY,
  resolveSectionBackground,
  type LovelaceSectionRawConfig,
} from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

interface SettingsData {
  column_span?: number;
  background_enabled?: boolean;
  background_color?: string;
  background_opacity?: number;
  theme?: string;
}

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public viewConfig!: LovelaceViewConfig;

  private _schema = memoizeOne(
    (maxColumns: number, backgroundEnabled: boolean, localize: LocalizeFunc) =>
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
          name: "background_enabled",
          selector: { boolean: {} },
        },
        ...(backgroundEnabled
          ? ([
              {
                name: "background",
                type: "expandable",
                flatten: true,
                expanded: true,
                iconPath: mdiPalette,
                schema: [
                  {
                    name: "background_color",
                    selector: {
                      ui_color: {
                        extra_options: [
                          {
                            value: "default",
                            label: localize(
                              "ui.panel.lovelace.editor.edit_section.settings.background_color_default"
                            ),
                            display_color:
                              "var(--ha-section-background-color, var(--secondary-background-color))",
                          },
                        ],
                      },
                    },
                  },
                  {
                    name: "background_opacity",
                    selector: {
                      number: {
                        min: 0,
                        max: 100,
                        step: 1,
                        unit_of_measurement: "%",
                        mode: "slider",
                      },
                    },
                  },
                ],
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
        {
          name: "theme",
          selector: {
            theme: {},
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  render() {
    const backgroundEnabled = this.config.background !== undefined;
    const background = resolveSectionBackground(this.config.background);

    const data: SettingsData = {
      column_span: this.config.column_span || 1,
      background_enabled: backgroundEnabled,
      background_color: background?.color ?? "default",
      background_opacity:
        background?.opacity ?? DEFAULT_SECTION_BACKGROUND_OPACITY,
      theme: this.config.theme,
    };

    const schema = this._schema(
      this.viewConfig.max_columns || 4,
      backgroundEnabled,
      this.hass.localize
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

    const newConfig: LovelaceSectionRawConfig = {
      ...this.config,
      column_span: newData.column_span,
    };

    if (newData.background_enabled) {
      const hasCustomColor =
        newData.background_color !== undefined &&
        newData.background_color !== "default";

      newConfig.background = {
        ...(hasCustomColor ? { color: newData.background_color } : {}),
        opacity: newData.background_opacity!,
      };
    } else {
      delete newConfig.background;
    }

    // Only include theme if it's set.
    if (newData.theme) {
      newConfig.theme = newData.theme;
    } else {
      delete newConfig.theme;
    }

    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-settings-editor": HuiDialogEditSection;
  }
}
