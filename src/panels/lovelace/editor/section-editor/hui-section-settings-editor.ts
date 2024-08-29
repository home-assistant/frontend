import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { HomeAssistant } from "../../../../types";

type SettingsData = {
  title: string;
  column_span?: number;
};

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  @property({ attribute: false }) public viewConfig!: LovelaceViewConfig;

  private _schema = memoizeOne(
    (maxColumns: number) =>
      [
        {
          name: "title",
          selector: { text: {} },
        },
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

  render() {
    const data: SettingsData = {
      title: this.config.title || "",
      column_span: this.config.column_span || 1,
    };

    const schema = this._schema(this.viewConfig.max_columns || 4);

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
      title: newData.title,
      column_span: newData.column_span,
    };

    if (!newConfig.title) {
      delete newConfig.title;
    }

    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-settings-editor": HuiDialogEditSection;
  }
}
