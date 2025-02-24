import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { computeRTL } from "../../../../common/util/compute_rtl";
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
import {
  DEFAULT_VIEW_HEADER_BADGES_POSITION,
  DEFAULT_VIEW_HEADER_LAYOUT,
} from "../../views/hui-view-header";

@customElement("hui-view-header-settings-editor")
export class HuiViewHeaderSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  private _schema = memoizeOne(
    (localize: LocalizeFunc, isRTL: boolean) =>
      [
        {
          name: "layout",
          selector: {
            select: {
              options: [
                {
                  value: "responsive",
                  label: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.responsive"
                  ),
                },
                {
                  value: "start",
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.layout_options.${isRTL ? "start_rtl" : "start"}`
                  ),
                },
                {
                  value: "center",
                  label: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.center"
                  ),
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
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.badges_position_options.bottom`
                  ),
                },
                {
                  value: "top",
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.badges_position_options.top`
                  ),
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
      layout: this.config?.layout || DEFAULT_VIEW_HEADER_LAYOUT,
      extra_space: this.config?.extra_space || false,
      badges_position:
        this.config?.badges_position || DEFAULT_VIEW_HEADER_BADGES_POSITION,
    };

    const isRTL = computeRTL(this.hass);
    const schema = this._schema(this.hass.localize, isRTL);

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
