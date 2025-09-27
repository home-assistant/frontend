import memoizeOne from "memoize-one";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
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
      name: "image",
      selector: { background: { original: true } },
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
                name: "opacity",
                selector: {
                  number: { min: 0, max: 100, mode: "slider", step: 10 },
                },
              },
              {
                name: "attachment",
                selector: {
                  button_toggle: {
                    translation_key:
                      "ui.panel.lovelace.editor.edit_view.background.attachment",
                    options: ["scroll", "fixed"],
                  },
                },
              },
              {
                name: "size",
                required: true,
                selector: {
                  select: {
                    translation_key:
                      "ui.panel.lovelace.editor.edit_view.background.size",
                    options: ["auto", "cover", "contain"],
                    mode: "dropdown",
                  },
                },
              },
              {
                name: "alignment",
                required: true,
                selector: {
                  select: {
                    translation_key:
                      "ui.panel.lovelace.editor.edit_view.background.alignment",
                    options: [
                      "top left",
                      "top center",
                      "top right",
                      "center left",
                      "center",
                      "center right",
                      "bottom left",
                      "bottom center",
                      "bottom right",
                    ],
                    mode: "dropdown",
                  },
                },
              },
              {
                name: "repeat",
                required: true,
                selector: {
                  select: {
                    translation_key:
                      "ui.panel.lovelace.editor.edit_view.background.repeat",
                    options: ["repeat", "no-repeat"],
                    mode: "dropdown",
                  },
                },
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

    let background = this._config?.background;
    if (typeof background === "string") {
      const backgroundUrl = background.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];

      background = {
        image: backgroundUrl,
      };
    }

    if (!background) {
      background = {
        opacity: 33,
        alignment: "center",
        size: "cover",
        repeat: "repeat",
        attachment: "fixed",
      };
    } else {
      background = {
        opacity: 100,
        alignment: "center",
        size: "cover",
        repeat: "no-repeat",
        attachment: "scroll",
        ...background,
      };
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${background}
        .schema=${this._schema(true)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
        .localizeValue=${this._localizeValueCallback}
        style=${`--picture-opacity: ${(background.opacity ?? 100) / 100};`}
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
    switch (schema.name) {
      case "image":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.image"
        );
      case "opacity":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.opacity"
        );
      case "alignment":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.alignment.name"
        );
      case "size":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.size.name"
        );
      case "repeat":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.repeat.name"
        );
      case "attachment":
        return this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.background.attachment.name"
        );
      default:
        return this.hass.localize(
          `ui.panel.lovelace.editor.edit_view.background.${schema.name}`
        );
    }
  };

  static styles = css`
    :host {
      display: block;
      --file-upload-image-border-radius: var(--ha-border-radius-sm);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background-editor": HuiViewBackgroundEditor;
  }
}
