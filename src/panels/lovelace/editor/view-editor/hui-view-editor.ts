import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import { listenMediaQuery } from "../../../../common/dom/media_query";
import { clamp } from "../../../../common/number/clamp";
import { slugify } from "../../../../common/string/slugify";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import {
  DEFAULT_MAX_COLUMNS,
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

const MAX_COLUMNS_PRESETS = [1, 2, 3, 4] as const;
const MAX_COLUMNS_MORE = "more";
const MIN_CUSTOM_MAX_COLUMNS = MAX_COLUMNS_PRESETS.length + 1;
const MAX_CUSTOM_MAX_COLUMNS = 10;

interface MaxColumnsFormData {
  max_columns: string;
  max_columns_custom: number;
}

const maxColumnsToFormData = (maxColumns: number): MaxColumnsFormData => {
  if (maxColumns <= MAX_COLUMNS_PRESETS.length) {
    return {
      max_columns: String(maxColumns),
      max_columns_custom: MIN_CUSTOM_MAX_COLUMNS,
    };
  }
  return { max_columns: MAX_COLUMNS_MORE, max_columns_custom: maxColumns };
};

const maxColumnsFromFormData = (data: MaxColumnsFormData): number => {
  if (data.max_columns !== MAX_COLUMNS_MORE) {
    return Number(data.max_columns);
  }
  return clamp(
    data.max_columns_custom,
    MIN_CUSTOM_MAX_COLUMNS,
    MAX_CUSTOM_MAX_COLUMNS
  );
};

@customElement("hui-view-editor")
export class HuiViewEditor extends LitElement {
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public isNew = false;

  @state() private _config!: LovelaceViewConfig;

  @state() private _error: Record<string, string> | undefined;

  @state() private _narrow = false;

  private _unsubMql?: () => void;

  private _suggestedPath = false;

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubMql = listenMediaQuery("(max-width: 600px)", (matches) => {
      this._narrow = matches;
    });
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubMql?.();
    this._unsubMql = undefined;
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, narrow: boolean) =>
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
        {
          name: "show_icon_and_title",
          selector: {
            boolean: {},
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
        {
          name: "section_specifics",
          type: "expandable",
          flatten: true,
          expanded: true,
          visible: {
            field: "type",
            value: SECTIONS_VIEW_LAYOUT,
          },
          schema: [
            {
              name: "max_columns",
              selector: {
                select: {
                  mode: "box",
                  box_max_columns: narrow ? 3 : 5,
                  options: [
                    ...MAX_COLUMNS_PRESETS.map((count) => ({
                      value: String(count),
                      label: String(count),
                    })),
                    {
                      value: MAX_COLUMNS_MORE,
                      label: localize(
                        "ui.panel.lovelace.editor.edit_view.max_columns_more"
                      ),
                    },
                  ],
                },
              },
            },
            {
              name: "max_columns_custom",
              visible: { field: "max_columns", value: MAX_COLUMNS_MORE },
              selector: {
                number: {
                  min: MIN_CUSTOM_MAX_COLUMNS,
                  max: MAX_CUSTOM_MAX_COLUMNS,
                  mode: "box",
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
      ] as const satisfies HaFormSchema[]
  );

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  private get _maxColumns(): number {
    return this._config.max_columns ?? DEFAULT_MAX_COLUMNS;
  }

  get _type(): string {
    return getViewType(this._config);
  }

  protected render() {
    const data = {
      ...this._config,
      ...maxColumnsToFormData(this._maxColumns),
      type: this._type,
      theme:
        this._config.theme?.toLowerCase() === "backend-selected"
          ? undefined
          : this._config.theme,
    };

    return html`
      <ha-form
        .data=${data}
        .schema=${this._schema(this._localize, this._narrow)}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        .computeError=${this._computeError}
        .error=${this._error}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const {
      max_columns: maxColumnsChoice,
      max_columns_custom: maxColumnsCustom,
      ...rest
    } = ev.detail.value as Omit<LovelaceViewConfig, "max_columns"> &
      MaxColumnsFormData;
    const config: LovelaceViewConfig = rest;

    const maxColumns = maxColumnsFromFormData({
      max_columns: maxColumnsChoice,
      max_columns_custom: maxColumnsCustom,
    });
    if (maxColumns !== this._maxColumns) {
      config.max_columns = maxColumns;
    } else if (this._config.max_columns !== undefined) {
      config.max_columns = this._config.max_columns;
    }

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
    this._localize(`ui.panel.lovelace.editor.edit_view.${error}`) || error;

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "path":
        return this._localize("ui.panel.lovelace.editor.card.generic.url");
      case "type":
      case "show_icon_and_title":
      case "subview":
      case "max_columns":
      case "max_columns_custom":
      case "dense_section_placement":
      case "top_margin":
      case "section_specifics":
        return this._localize(
          `ui.panel.lovelace.editor.edit_view.${schema.name}`
        );
      default:
        return this._localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "path":
      case "show_icon_and_title":
      case "subview":
      case "max_columns":
      case "dense_section_placement":
      case "top_margin":
        return this._localize(
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
