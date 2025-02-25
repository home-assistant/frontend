import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import { listenMediaQuery } from "../../../../common/dom/media_query";

@customElement("hui-view-header-settings-editor")
export class HuiViewHeaderSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  @state({ attribute: false }) private narrow = false;

  private _unsubMql?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubMql = listenMediaQuery("(max-width: 600px)", (matches) => {
      this.narrow = matches;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMql?.();
    this._unsubMql = undefined;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      isRTL: boolean,
      isDark: boolean,
      narrow: boolean
    ) =>
      [
        {
          name: "layout",
          selector: {
            select: {
              mode: "box",
              box_max_columns: narrow ? 1 : 3,
              options: [
                {
                  value: "responsive",
                  label: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.responsive"
                  ),
                  description: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.responsive_description"
                  ),
                  image: `/static/images/form/view_header_layout_responsive${isDark ? "_dark" : ""}.svg`,
                },
                {
                  value: "start",
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.layout_options.${isRTL ? "start_rtl" : "start"}`
                  ),
                  description: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.start_description"
                  ),
                  image: `/static/images/form/view_header_layout_start${isDark ? "_dark" : ""}.svg`,
                },
                {
                  value: "center",
                  label: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.center"
                  ),
                  description: localize(
                    "ui.panel.lovelace.editor.edit_view_header.settings.layout_options.center_description"
                  ),
                  image: `/static/images/form/view_header_layout_center${isDark ? "_dark" : ""}.svg`,
                },
              ],
            },
          },
        },
        {
          name: "badges_position",
          selector: {
            select: {
              mode: "box",
              options: [
                {
                  value: "bottom",
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.badges_position_options.bottom`
                  ),
                  image: `/static/images/form/view_header_badges_position_bottom${isDark ? "_dark" : ""}.svg`,
                },
                {
                  value: "top",
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.badges_position_options.top`
                  ),
                  image: `/static/images/form/view_header_badges_position_top${isDark ? "_dark" : ""}.svg`,
                },
              ],
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
      layout: this.config?.layout || DEFAULT_VIEW_HEADER_LAYOUT,
      badges_position:
        this.config?.badges_position || DEFAULT_VIEW_HEADER_BADGES_POSITION,
    };

    const isDark = this.hass.themes.darkMode;
    const narrow = this.narrow;
    const isRTL = computeRTL(this.hass);
    const schema = this._schema(this.hass.localize, isRTL, isDark, narrow);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
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
      default:
        return schema.name;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header-settings-editor": HuiViewHeaderSettingsEditor;
  }
}
