import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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

// Compact mode: radio + title + description, no boxes/illustrations. `columns`
// controls how many options sit per row (mockup: layout 3-up, badges 2-up).
const COMPACT_SETTINGS = [
  {
    name: "layout",
    values: ["responsive", "start", "center", "inline"],
    columns: 2,
  },
  { name: "badges_position", values: ["top", "bottom"], columns: 2 },
  { name: "badges_wrap", values: ["wrap", "scroll"], columns: 2 },
] as const;

type CompactScope = "all" | "badges" | "layout";

@customElement("hui-view-header-settings-editor")
export class HuiViewHeaderSettingsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  // When set, options render as compact radio + title + description (used by
  // the single-page concept) instead of the full boxed ha-form selectors.
  @property({ type: Boolean }) public compact = false;

  // Which settings to show in compact mode: "badges" = position + behavior,
  // "layout" = alignment only, "all" = everything.
  @property() public scope: CompactScope = "all";

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
    const isRTL = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );

    if (this.compact) {
      return this._renderCompact(data, isRTL);
    }

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

  private _renderCompact(data: Record<string, string>, isRTL: boolean) {
    const settings = COMPACT_SETTINGS.filter((setting) => {
      if (this.scope === "badges") {
        return setting.name !== "layout";
      }
      if (this.scope === "layout") {
        return setting.name === "layout";
      }
      return true;
    });

    return html`
      <div class="compact">
        ${settings.map(
          (setting) => html`
            <div
              class="options"
              role="radiogroup"
              style=${`--columns: ${this.narrow ? 1 : setting.columns}`}
            >
              ${setting.values.map((value) => {
                const selected = data[setting.name] === value;
                const labelKey =
                  setting.name === "layout" && value === "start" && isRTL
                    ? "start_rtl"
                    : value;
                return html`
                  <button
                    type="button"
                    class=${classMap({ option: true, selected })}
                    role="radio"
                    aria-checked=${selected}
                    @click=${this._compactOptionClicked}
                    data-name=${setting.name}
                    data-value=${value}
                  >
                    <span class="radio" aria-hidden="true"></span>
                    <span class="text">
                      <span class="option-label"
                        >${this.hass.localize(
                          `ui.panel.lovelace.editor.edit_view_header.settings.${setting.name}_options.${labelKey}` as const
                        )}</span
                      >
                      <span class="option-description"
                        >${this.hass.localize(
                          `ui.panel.lovelace.editor.edit_view_header.settings.${setting.name}_options.${value}_description` as const
                        )}</span
                      >
                    </span>
                  </button>
                `;
              })}
            </div>
          `
        )}
      </div>
    `;
  }

  private _compactOptionClicked(ev: Event): void {
    const target = ev.currentTarget as HTMLElement;
    const name = target.dataset.name!;
    const value = target.dataset.value!;
    if (this.config?.[name] === value) {
      return;
    }
    const config: LovelaceViewHeaderConfig = {
      ...this.config,
      [name]: value,
    };
    fireEvent(this, "config-changed", { config });
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

  static styles: CSSResultGroup = css`
    .compact {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-5);
    }
    /* Radio + title + description, no boxes. */
    .options {
      display: grid;
      grid-template-columns: repeat(var(--columns, 1), minmax(0, 1fr));
      gap: var(--ha-space-3) var(--ha-space-4);
    }
    .option {
      appearance: none;
      border: 0;
      background: none;
      cursor: pointer;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: var(--ha-space-2);
      padding: 0;
      text-align: start;
      font-family: inherit;
      color: var(--primary-text-color);
    }
    .radio {
      flex: none;
      box-sizing: border-box;
      width: 20px;
      height: 20px;
      margin-top: 1px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      transition:
        border-color 120ms ease-in-out,
        background 120ms ease-in-out;
    }
    .option:hover .radio {
      border-color: var(--primary-text-color);
    }
    .option.selected .radio {
      border-color: var(--primary-color);
      border-width: 6px;
      background: var(--card-background-color);
    }
    .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .option-label {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
    }
    .option-description {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header-settings-editor": HuiViewHeaderSettingsEditor;
  }
}
