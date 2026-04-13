import type { PropertyValues } from "lit";
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
import type { LovelaceViewHeaderConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import {
  DEFAULT_VIEW_HEADER_BADGES_POSITION,
  DEFAULT_VIEW_HEADER_BADGES_WRAP,
  DEFAULT_VIEW_HEADER_LAYOUT,
  VIEW_HEADER_LAYOUT_INTEGRATED,
} from "../../views/hui-view-header";
import { listenMediaQuery } from "../../../../common/dom/media_query";

@customElement("hui-view-header-settings-editor")
export class HuiViewHeaderSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  @state({ attribute: false }) private narrow = false;

  @state() private _selectedLayout = DEFAULT_VIEW_HEADER_LAYOUT;

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

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("config")) {
      this._selectedLayout = this.config?.layout ?? DEFAULT_VIEW_HEADER_LAYOUT;
    }
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      isRTL: boolean,
      narrow: boolean,
      integratedLayout: boolean
    ) =>
      [
        {
          name: "layout",
          selector: {
            select: {
              mode: "box",
              box_max_columns: narrow ? 1 : 4,
              options: [
                "responsive",
                "start",
                "center",
                VIEW_HEADER_LAYOUT_INTEGRATED,
              ].map((value) => {
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
                    src: `/static/images/form/view_header_layout_${value === VIEW_HEADER_LAYOUT_INTEGRATED ? "responsive" : value}.svg`,
                    src_dark: `/static/images/form/view_header_layout_${value === VIEW_HEADER_LAYOUT_INTEGRATED ? "responsive" : value}_dark.svg`,
                    flip_rtl: true,
                  },
                };
              }),
            },
          },
        },
        {
          name: "badges_position",
          disabled: integratedLayout,
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
          disabled: integratedLayout,
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

    const layout = this._selectedLayout;
    const integratedLayout = layout === VIEW_HEADER_LAYOUT_INTEGRATED;

    const data = {
      layout,
      badges_position: integratedLayout
        ? "top"
        : (this.config?.badges_position ?? DEFAULT_VIEW_HEADER_BADGES_POSITION),
      badges_wrap: integratedLayout
        ? "scroll"
        : (this.config?.badges_wrap ?? DEFAULT_VIEW_HEADER_BADGES_WRAP),
    };

    const narrow = this.narrow;
    const isRTL = computeRTL(this.hass);
    const schema = this._schema(
      this.hass.localize,
      isRTL,
      narrow,
      integratedLayout
    );

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

  private _valueChanged(ev: ValueChangedEvent<LovelaceViewHeaderConfig>): void {
    ev.stopPropagation();

    const layout =
      ev.detail.value.layout ??
      this._selectedLayout ??
      DEFAULT_VIEW_HEADER_LAYOUT;
    this._selectedLayout = layout;

    const integratedLayout = layout === VIEW_HEADER_LAYOUT_INTEGRATED;

    const config: LovelaceViewHeaderConfig = {
      ...this.config,
      ...ev.detail.value,
    };

    if (integratedLayout) {
      config.badges_position = "top";
      config.badges_wrap = "scroll";
    }

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
