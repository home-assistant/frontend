import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { slugify } from "../../../../common/string/slugify";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import {
  MASONRY_VIEW_LAYOUT,
  SECTIONS_VIEW_LAYOUT,
  PANEL_VIEW_LAYOUT,
  SIDEBAR_VIEW_LAYOUT,
} from "../../views/const";
import { getViewType } from "../../views/get-view-type";

declare global {
  interface HASSDomEvents {
    "view-config-changed": {
      config: LovelaceViewConfig;
      valid?: boolean;
    };
  }
}

const VALID_PATH_REGEX = /^[a-zA-Z0-9_-]+$/;
const INTEGER_REGEX = /^[0-9]+$/;

@customElement("hui-view-editor")
export class HuiViewEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public isNew = false;

  @state() private _config!: LovelaceViewConfig;

  @state() private _error: Record<string, string> | undefined;

  private _suggestedPath = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc, viewType: string) =>
      [
        {
          name: "type",
          selector: {
            select: {
              options: (
                [
                  SECTIONS_VIEW_LAYOUT,
                  MASONRY_VIEW_LAYOUT,
                  SIDEBAR_VIEW_LAYOUT,
                  PANEL_VIEW_LAYOUT,
                ] as const
              ).map((type) => ({
                value: type,
                label: localize(
                  `ui.panel.lovelace.editor.edit_view.types.${type}`
                ),
              })),
            },
          },
        },
        { name: "title", selector: { text: {} } },
        {
          name: "icon",
          selector: {
            icon: {},
          },
        },
        { name: "path", selector: { text: {} } },
        { name: "theme", selector: { theme: {} } },
        {
          name: "subview",
          selector: {
            boolean: {},
          },
        },
        ...(viewType === SECTIONS_VIEW_LAYOUT
          ? ([
              {
                name: "section_specifics",
                type: "expandable",
                flatten: true,
                expanded: true,
                schema: [
                  {
                    name: "max_columns",
                    selector: {
                      number: {
                        min: 1,
                        max: 10,
                        mode: "slider",
                        slider_ticks: true,
                      },
                    },
                  },
                  {
                    name: "dense_section_placement",
                    selector: {
                      boolean: {},
                    },
                  },
                  {
                    name: "top_margin",
                    selector: {
                      boolean: {},
                    },
                  },
                ],
              },
            ] as const satisfies HaFormSchema[])
          : []),
      ] as const satisfies HaFormSchema[]
  );

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  get _type(): string {
    return getViewType(this._config);
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const schema = this._schema(this.hass.localize, this._type);

    const data = {
      ...this._config,
      type: this._type,
    };

    if (data.max_columns === undefined && this._type === SECTIONS_VIEW_LAYOUT) {
      data.max_columns = 4;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        .computeError=${this._computeError}
        .error=${this._error}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = ev.detail.value as LovelaceViewConfig;

    if (config.type !== SECTIONS_VIEW_LAYOUT) {
      delete config.max_columns;
      delete config.dense_section_placement;
      delete config.top_margin;
    }

    const slugifyTitle = (title: string | undefined) => {
      const slug = slugify(title || "", "-");
      if (INTEGER_REGEX.test(slug)) {
        return `view-${slug}`;
      }
      return slug;
    };

    if (
      this.isNew &&
      !this._suggestedPath &&
      this._config.path === config.path &&
      (!this._config.path || config.path === slugifyTitle(this._config.title))
    ) {
      config.path = slugifyTitle(config.title);
    }

    let valid = true;
    this._error = undefined;
    if (config.path && !VALID_PATH_REGEX.test(config.path)) {
      valid = false;
      this._error = { path: "error_invalid_path" };
    } else if (config.path && INTEGER_REGEX.test(config.path)) {
      valid = false;
      this._error = { path: "error_number" };
    }

    fireEvent(this, "view-config-changed", { valid, config });
  }

  private _computeError = (error: string) =>
    this.hass.localize(`ui.panel.lovelace.editor.edit_view.${error}` as any) ||
    error;

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "path":
        return this.hass!.localize("ui.panel.lovelace.editor.card.generic.url");
      case "type":
      case "subview":
      case "max_columns":
      case "dense_section_placement":
      case "top_margin":
      case "section_specifics":
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "path":
      case "subview":
      case "dense_section_placement":
      case "top_margin":
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view.${schema.name}_helper`
        );

      default:
        return undefined;
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-editor": HuiViewEditor;
  }
}
