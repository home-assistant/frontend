import "@material/mwc-list/mwc-list-item";
import type { CSSResultGroup } from "lit";
import memoizeOne from "memoize-one";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-selector/ha-selector-image";
import type {
  LovelaceViewBackgroundConfig,
  LovelaceViewConfig,
} from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";

@customElement("hui-view-background-editor")
export class HuiViewBackgroundEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: LovelaceViewConfig;

  set config(config: LovelaceViewConfig) {
    this._config = config;
  }

  private _localizeValueCallback = (key: string) =>
    this.hass.localize(key as any);

  private _schema = memoizeOne((showSettings: boolean) => [
    {
      name: "backgroundUrl",
      selector: { image: { original: true } },
    },
    ...(showSettings
      ? ([
          {
            name: "settings",
            flatten: true,
            expanded: true,
            type: "expandable" as const,
            schema: [
              {
                name: "transparency",
                selector: {
                  number: { min: 1, max: 100, mode: "box" },
                },
              },
              {
                name: "size",
                selector: {
                  select: {
                    translation_key:
                      "ui.panel.lovelace.editor.edit_view.background.size",
                    default: "center",
                    options: [
                      "top_left",
                      "top_center",
                      "top_right",
                      "center_left",
                      "center",
                      "center_right",
                      "bottom_left",
                      "bottom_center",
                      "bottom_right",
                    ],
                  },
                },
              },
              {
                name: "alignment",
                selector: {
                  select: {
                    translation_key:
                      "ui.panel.lovelace.editor.edit_view.background.alignment",
                    default: "original",
                    options: ["original", "fill_view", "fit_view"],
                  },
                },
              },
              {
                name: "tile",
                selector: { boolean: {} },
              },
            ],
          },
        ] as const)
      : []),
  ]);

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const background = this._config?.background;
    let data: LovelaceViewBackgroundConfig = {};
    if (typeof background === "string") {
      const backgroundUrl = background.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];

      data = {
        image: backgroundUrl,
      };
    } else if (background) {
      data = background;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._schema(typeof background !== "string")}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
        .localizeValue=${this._localizeValueCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = {
      ...this._config,
      background: ev.detail.value,
    };
    fireEvent(this, "view-config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    console.log(schema.name);
    switch (schema.name) {
      case "backgroundUrl":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.image"
        );
      case "transparency":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.transparency"
        );
      case "alignment":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.alignment.name"
        );
      case "size":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.size.name"
        );
      default:
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view.background.${schema.name}`
        );
    }
  };

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background-editor": HuiViewBackgroundEditor;
  }
}
