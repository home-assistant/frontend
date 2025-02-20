import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type {
  LovelaceViewConfig,
  LovelaceViewHeaderConfig,
} from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

@customElement("hui-view-header-settings-editor")
export class HuiViewHeaderSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  private _schema = memoizeOne(
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
        { name: "extra_space", selector: { boolean: {} } },
      ] as const satisfies HaFormSchema[]
  );

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const data = {
      layout: this.config?.layout || "responsive",
      extra_space: this.config?.extra_space || false,
      badges_position: this.config?.badges_position || "bottom",
    };

    const schema = this._schema();

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
    const newData = ev.detail.value as LovelaceViewConfig;

    const config: LovelaceViewHeaderConfig = {
      ...this.config,
      ...newData,
    };

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "layout":
      case "badges_position":
      case "extra_space":
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view_header.settings.${schema.name}`
        );
      default:
        return "";
    }
  };

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "extra_space":
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view_header.settings.${schema.name}_helper`
        );
      default:
        return undefined;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header-settings-editor": HuiViewHeaderSettingsEditor;
  }
}
