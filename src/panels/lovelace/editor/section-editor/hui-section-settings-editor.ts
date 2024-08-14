import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import {
  isStrategySection,
  LovelaceGridSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../../data/lovelace/config/section";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../../types";
import { LocalizeFunc } from "../../../../common/translations/localize";
import { DEFAULT_GRID_BASE } from "../../sections/hui-grid-section";

type GridDensity = "default" | "dense" | "custom";

type SettingsData = {
  column_span?: number;
  grid_density?: GridDensity;
};

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public viewConfig!: LovelaceViewConfig;

  private _schema = memoizeOne(
    (
      maxColumns: number,
      localize: LocalizeFunc,
      type?: string | undefined,
      columnDensity?: GridDensity,
      columnBase?: number
    ) =>
      [
        {
          name: "title",
          selector: { text: {} },
        },
        ...(type === "grid"
          ? ([
              {
                name: "grid_density",
                default: "default",
                selector: {
                  select: {
                    mode: "list",
                    options: [
                      {
                        label: localize(
                          `ui.panel.lovelace.editor.edit_section.settings.grid_density_options.default`,
                          { count: 4 }
                        ),
                        value: "default",
                      },
                      {
                        label: localize(
                          `ui.panel.lovelace.editor.edit_section.settings.grid_density_options.dense`,
                          { count: 6 }
                        ),
                        value: "dense",
                      },
                      ...(columnDensity === "custom" && columnBase
                        ? [
                            {
                              label: localize(
                                `ui.panel.lovelace.editor.edit_section.settings.grid_density_options.custom`,
                                { count: columnBase }
                              ),
                              value: "custom",
                            },
                          ]
                        : []),
                    ],
                  },
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies HaFormSchema[]
  );

  private _isGridSectionConfig(
    config: LovelaceSectionRawConfig
  ): config is LovelaceGridSectionConfig {
    return !isStrategySection(config) && config.type === "grid";
  }

  render() {
    const gridBase = this._isGridSectionConfig(this.config)
      ? this.config.grid_base || DEFAULT_GRID_BASE
      : undefined;

    const columnDensity =
      gridBase === 6 ? "dense" : gridBase === 4 ? "default" : "custom";

    const data: SettingsData = {
      column_span: this.config.column_span || 1,
      grid_density: columnDensity,
    };

    const type = "type" in this.config ? this.config.type : undefined;

    const schema = this._schema(
      this.viewConfig.max_columns || 4,
      this.hass.localize,
      type,
      columnDensity,
      gridBase
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

    const { column_span, grid_density } = newData;

    const newConfig: LovelaceSectionRawConfig = {
      ...this.config,
      column_span: column_span,
    };

    if (this._isGridSectionConfig(newConfig)) {
      const gridBase =
        grid_density === "default"
          ? 4
          : grid_density === "dense"
            ? 6
            : undefined;

      if (gridBase) {
        (newConfig as LovelaceGridSectionConfig).grid_base = gridBase;
      }
    }

    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-settings-editor": HuiDialogEditSection;
  }
}
