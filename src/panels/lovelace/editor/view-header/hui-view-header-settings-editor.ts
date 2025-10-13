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
  DEFAULT_VIEW_HEADER_BADGES_WRAP,
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
    (localize: LocalizeFunc, isRTL: boolean, narrow: boolean) =>
      [
        {
          name: "layout",
          selector: {
            select: {
              mode: "box",
              box_max_columns: narrow ? 1 : 3,
              options: ["responsive", "start", "center"].map((value) => {
                const labelKey =
                  value === "start" && isRTL ? `${value}_rtl` : value;
                return {
                  value,
                  label: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.layout_options.${labelKey}`
                  ),
                  description: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.layout_options.${value}_description`
                  ),
                  image: {
                    src: `/static/images/form/view_header_layout_${value}.svg`,
                    src_dark: `/static/images/form/view_header_layout_${value}_dark.svg`,
                    flip_rtl: true,
                  },
                };
              }),
            },
          },
        },
        {
          name: "badges_position",
          selector: {
            select: {
              mode: "box",
              options: ["bottom", "top"].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.edit_view_header.settings.badges_position_options.${value}`
                ),
                image: {
                  src: `/static/images/form/view_header_badges_position_${value}.svg`,
                  src_dark: `/static/images/form/view_header_badges_position_${value}_dark.svg`,
                  flip_rtl: true,
                },
              })),
            },
          },
        },
        {
          name: "badges_wrap",
          selector: {
            select: {
              mode: "box",
              options: ["wrap", "scroll"].map((value) => ({
                value,
                label: localize(
                  `ui.panel.lovelace.editor.edit_view_header.settings.badges_wrap_options.${value}`
                ),
                ...(value === "scroll" && {
                  description: localize(
                    `ui.panel.lovelace.editor.edit_view_header.settings.badges_wrap_options.${value}_description`
                  ),
                }),
                image: {
                  src: `/static/images/form/view_header_badges_wrap_${value}.svg`,
                  src_dark: `/static/images/form/view_header_badges_wrap_${value}_dark.svg`,
                  flip_rtl: true,
                },
              })),
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
      badges_wrap: this.config?.badges_wrap || DEFAULT_VIEW_HEADER_BADGES_WRAP,
    };

    const narrow = this.narrow;
    const isRTL = computeRTL(this.hass);
    const schema = this._schema(this.hass.localize, isRTL, narrow);

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
      case "badges_wrap":
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view_header.settings.${schema.name}`
        );
      default:
        return "";
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header-settings-editor": HuiViewHeaderSettingsEditor;
  }
}
