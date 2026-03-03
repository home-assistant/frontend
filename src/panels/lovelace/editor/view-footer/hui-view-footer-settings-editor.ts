import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { LovelaceViewFooterConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

const SCHEMA = [
  {
    name: "max_width",
    selector: {
      number: {
        min: 100,
        max: 1600,
        step: 10,
        unit_of_measurement: "px",
      },
    },
  },
] as const satisfies HaFormSchema[];

@customElement("hui-view-footer-settings-editor")
export class HuiViewFooterSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewFooterConfig;

  protected render() {
    const data = {
      max_width: this.config?.max_width || 600,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newData = ev.detail.value;

    const config: LovelaceViewFooterConfig = {
      ...this.config,
      ...newData,
    };

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabel = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_view_footer.settings.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-footer-settings-editor": HuiViewFooterSettingsEditor;
  }
}
