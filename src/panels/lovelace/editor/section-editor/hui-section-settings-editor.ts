import { mdiPalette } from "@mdi/js";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import {
  DEFAULT_SECTION_BACKGROUND_OPACITY,
  DEFAULT_SECTION_COLUMN_SPAN,
  resolveSectionBackground,
  type LovelaceSectionRawConfig,
} from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { DEFAULT_MAX_COLUMNS } from "../../views/const";

const COLUMN_SPAN_NAMES = ["single", "double", "triple"] as const;

const MAX_NAMED_COLUMN_SPAN = COLUMN_SPAN_NAMES.length + 1;

const computeColumnSpanLabel = (
  span: number,
  maxColumns: number,
  localize: LocalizeFunc
) => {
  if (span >= maxColumns) {
    return localize(
      "ui.panel.lovelace.editor.edit_section.settings.column_span_options.full"
    );
  }
  return localize(
    `ui.panel.lovelace.editor.edit_section.settings.column_span_options.${COLUMN_SPAN_NAMES[span - 1]}`
  );
};

const computeColumnSpanSchemas = (
  maxColumns: number,
  localize: LocalizeFunc
) => {
  if (maxColumns <= 1) {
    return [];
  }
  if (maxColumns > MAX_NAMED_COLUMN_SPAN) {
    return [
      {
        name: "column_span",
        selector: {
          number: { min: 1, max: maxColumns, slider_ticks: true },
        },
      },
    ] as const;
  }
  const options = Array.from({ length: maxColumns }, (_, i) => {
    const span = i + 1;
    return {
      value: String(span),
      label: computeColumnSpanLabel(span, maxColumns, localize),
      image: {
        src: `/static/images/form/section_column_span_${span}_of_${maxColumns}.svg`,
        src_dark: `/static/images/form/section_column_span_${span}_of_${maxColumns}_dark.svg`,
        flip_rtl: true,
      },
    };
  });
  return [
    {
      name: "column_span",
      selector: {
        select: {
          mode: "box",
          box_max_columns:
            maxColumns === MAX_NAMED_COLUMN_SPAN ? 2 : maxColumns,
          options,
        },
      },
    },
  ] as const;
};

interface SettingsData {
  column_span?: string | number;
  background_enabled?: boolean;
  background_color?: string;
  background_opacity?: number;
  theme?: string;
}

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public viewConfig!: LovelaceViewConfig;

  private get _maxColumns() {
    return this.viewConfig.max_columns || DEFAULT_MAX_COLUMNS;
  }

  private get _displayedColumnSpan() {
    return String(
      Math.min(
        this.config.column_span ?? DEFAULT_SECTION_COLUMN_SPAN,
        this._maxColumns
      )
    );
  }

  private get _columnSpanFormValue() {
    if (this._maxColumns > MAX_NAMED_COLUMN_SPAN) {
      return Number(this._displayedColumnSpan);
    }
    return this._displayedColumnSpan;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, maxColumns: number) =>
      [
        ...computeColumnSpanSchemas(maxColumns, localize),
        {
          name: "background_enabled",
          selector: { boolean: {} },
        },
        {
          name: "background",
          type: "expandable",
          flatten: true,
          expanded: true,
          visible: { field: "background_enabled", value: true },
          iconPath: mdiPalette,
          schema: [
            {
              name: "background_color",
              selector: {
                ui_color: {
                  default_color: "default",
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
              default: DEFAULT_SECTION_BACKGROUND_OPACITY,
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
        {
          name: "theme",
          selector: {
            theme: {},
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  render() {
    const background = resolveSectionBackground(this.config.background);
    const backgroundEnabled = background !== undefined;

    const data: SettingsData = {
      column_span: this._columnSpanFormValue,
      background_enabled: backgroundEnabled,
      background_color: background?.color,
      background_opacity: background?.opacity,
      theme: this.config.theme,
    };

    const schema = this._schema(this._localize, this._maxColumns);

    return html`
      <ha-form
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
    this._localize(
      `ui.panel.lovelace.editor.edit_section.settings.${schema.name}`
    );

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this._localize(
      `ui.panel.lovelace.editor.edit_section.settings.${schema.name}_helper`
    ) || "";

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newData = ev.detail.value as SettingsData;

    const newConfig: LovelaceSectionRawConfig = {
      ...this.config,
    };

    if (newData.column_span === undefined) {
      delete newConfig.column_span;
    } else if (String(newData.column_span) !== this._displayedColumnSpan) {
      const columnSpan = Number(newData.column_span);
      if (columnSpan === DEFAULT_SECTION_COLUMN_SPAN) {
        delete newConfig.column_span;
      } else {
        newConfig.column_span = columnSpan;
      }
    }

    if (newData.background_enabled) {
      const hasCustomColor =
        newData.background_color !== undefined &&
        newData.background_color !== "default";

      newConfig.background = {
        ...(hasCustomColor ? { color: newData.background_color } : {}),
        ...(newData.background_opacity !== undefined
          ? { opacity: newData.background_opacity }
          : {}),
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
