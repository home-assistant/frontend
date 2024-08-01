import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators";
import { LovelaceSectionRawConfig } from "../../../../data/lovelace/config/section";
import { HomeAssistant } from "../../../../types";
import {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { fireEvent } from "../../../../common/dom/fire_event";

const SCHEMA = [
  {
    name: "title",
    selector: { text: {} },
  },
  {
    name: "columns",
    selector: {
      number: {
        min: 1,
        max: 10,
        mode: "slider",
      },
    },
  },
] as const satisfies HaFormSchema[];

type SettingsData = {
  title: string;
  columns: number;
};

@customElement("hui-section-settings-editor")
export class HuiDialogEditSection extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceSectionRawConfig;

  render() {
    const data: SettingsData = {
      title: this.config.title || "",
      columns: this.config.columns || 1,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_section.settings.${schema.name}`
    );

  private _computeHelper = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_section.settings.${schema.name}_helper`
    ) || "";

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newData = ev.detail.value as SettingsData;

    const newConfig: LovelaceSectionRawConfig = {
      ...this.config,
      title: newData.title,
      columns: newData.columns,
    };

    if (!newConfig.title) {
      delete newConfig.title;
    }

    if (!newConfig.columns) {
      delete newConfig.columns;
    }

    fireEvent(this, "value-changed", { value: newConfig });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-settings-editor": HuiDialogEditSection;
  }
}
