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
import { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import {
  DEFAULT_VIEW_LAYOUT,
  SECTION_VIEW_LAYOUT,
  PANEL_VIEW_LAYOUT,
  SIDEBAR_VIEW_LAYOUT,
} from "../../views/const";

declare global {
  interface HASSDomEvents {
    "view-config-changed": {
      config: LovelaceViewConfig;
    };
  }
}

@customElement("hui-view-editor")
export class HuiViewEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isNew = false;

  @state() private _config!: LovelaceViewConfig;

  private _suggestedPath = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc, viewType: string) =>
      [
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
          name: "type",
          selector: {
            select: {
              options: (
                [
                  DEFAULT_VIEW_LAYOUT,
                  SIDEBAR_VIEW_LAYOUT,
                  PANEL_VIEW_LAYOUT,
                  SECTION_VIEW_LAYOUT,
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
        ...(viewType === SECTION_VIEW_LAYOUT
          ? ([
              {
                name: "max_columns",
                selector: {
                  number: {
                    min: 1,
                    max: 10,
                    mode: "slider",
                  },
                },
              },
            ] as const satisfies HaFormSchema[])
          : []),
        {
          name: "subview",
          selector: {
            boolean: {},
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  get _type(): string {
    if (!this._config) {
      return DEFAULT_VIEW_LAYOUT;
    }
    return this._config.panel
      ? PANEL_VIEW_LAYOUT
      : this._config.type || DEFAULT_VIEW_LAYOUT;
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

    if (data.max_columns === undefined && this._type === SECTION_VIEW_LAYOUT) {
      data.max_columns = 4;
    }

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
    const config = ev.detail.value as LovelaceViewConfig;

    if (config.type === DEFAULT_VIEW_LAYOUT) {
      delete config.type;
    }

    if (config.type !== SECTION_VIEW_LAYOUT) {
      delete config.max_columns;
    }

    if (
      this.isNew &&
      !this._suggestedPath &&
      config.title &&
      (!this._config.path ||
        config.path === slugify(this._config.title || "", "-"))
    ) {
      config.path = slugify(config.title, "-");
    }

    fireEvent(this, "view-config-changed", { config });
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "path":
        return this.hass!.localize("ui.panel.lovelace.editor.card.generic.url");
      case "type":
        return this.hass.localize("ui.panel.lovelace.editor.edit_view.type");
      case "subview":
        return this.hass.localize("ui.panel.lovelace.editor.edit_view.subview");
      case "max_columns":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.max_columns"
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
      case "subview":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.subview_helper"
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
