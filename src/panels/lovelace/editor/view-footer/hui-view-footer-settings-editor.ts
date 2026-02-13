import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { LovelaceViewFooterConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

@customElement("hui-view-footer-settings-editor")
export class HuiViewFooterSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewFooterConfig;

  @property({ attribute: false }) public maxColumns = 4;

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

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const data = {
      column_span: this.config?.column_span || 1,
    };

    const schema = this._schema(this.maxColumns);

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

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newData = ev.detail.value;

    const config: LovelaceViewFooterConfig = {
      ...this.config,
      ...newData,
    };

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_view_footer.settings.${schema.name}`
    );

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass.localize(
      `ui.panel.lovelace.editor.edit_view_footer.settings.${schema.name}_helper`
    ) || "";
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-footer-settings-editor": HuiViewFooterSettingsEditor;
  }
}
