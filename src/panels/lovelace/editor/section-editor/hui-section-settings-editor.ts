import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import {
  isStrategySection,
  type LovelaceSectionRawConfig,
} from "../../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

type SettingsData = Pick<
  LovelaceSectionRawConfig,
  "layout" | "top_margin" | "badges_position" | "column_span"
>;

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public viewConfig!: LovelaceViewConfig;

  private _headingSchema = memoizeOne(
    () =>
      [
        {
          name: "layout",
          selector: {
            select: {
              options: [
                {
                  value: "responsive",
                  label: "Responsive (Stacked on mobile)",
                },
                {
                  value: "start",
                  label: "Left aligned (Always stacked)",
                },
                {
                  value: "center",
                  label: "Centered aligned (Always stacked)",
                },
              ],
            },
          },
        },
        {
          name: "badges_position",
          selector: {
            select: {
              options: [
                {
                  value: "bottom",
                  label: "Bottom",
                },
                {
                  value: "top",
                  label: "Top",
                },
              ],
            },
          },
        },
        { name: "top_margin", selector: { boolean: {} } },
      ] as const satisfies HaFormSchema[]
  );

  private _schema = memoizeOne(
    (maxColumns: number) =>
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
      ] as const satisfies HaFormSchema[]
  );

  private _getData(): SettingsData {
    if (!isStrategySection(this.config) && this.config.type === "heading") {
      return {
        layout: this.config.layout || "responsive",
        top_margin: this.config.top_margin || false,
        badges_position: this.config.badges_position || "bottom",
      };
    }
    return {
      column_span: this.config.column_span || 1,
    };
  }

  private _getSchema(): HaFormSchema[] {
    if (!isStrategySection(this.config) && this.config.type === "heading") {
      return this._headingSchema();
    }
    return this._schema(this.viewConfig.max_columns || 4);
  }

  render() {
    const data = this._getData();
    const schema = this._getSchema();

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
      ...newData,
    };

    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-settings-editor": HuiDialogEditSection;
  }
}
