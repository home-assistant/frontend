import memoizeOne from "memoize-one";
import { LitElement, css, html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { ToggleButton } from "../../../../types";

import {
  isMediaSourceContentId,
  resolveMediaSource,
} from "../../../../data/media_source";

type BackgroundMode = "image" | "gradient";

function _detectMode(config?: LovelaceViewConfig): BackgroundMode {
  const bg = config?.background;
  if (typeof bg === "string" && bg.includes("radial-gradient")) {
    return "gradient";
  }
  return "image";
}

@customElement("hui-view-background-editor")
export class HuiViewBackgroundEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config!: LovelaceViewConfig;

  @state({ attribute: false }) private _resolvedImage?: string;

  @state() private _mode: BackgroundMode = "image";

  set config(config: LovelaceViewConfig) {
    if (!this._config) {
      this._mode = _detectMode(config);
    }
    this._config = config;
  }

  private _localizeValueCallback = (key: string) =>
    this.hass.localize(key as any);

  private _schema = memoizeOne(
    (localize: LocalizeFunc, showSettings: boolean) =>
      [
        {
          name: "image",
          selector: {
            media: {
              accept: ["image/*"] as string[],
              clearable: true,
              image_upload: true,
              hide_content_type: true,
              content_id_helper: localize(
                "ui.panel.lovelace.editor.card.picture.content_id_helper"
              ),
            },
          },
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
      ] as const
  );

  protected updated(changedProps: PropertyValues) {
    if (
      this._mode === "image" &&
      this._config &&
      this.hass &&
      (changedProps.has("_config") ||
        (changedProps.has("hass") && !changedProps.get("hass")))
    ) {
      const background = this._backgroundData(this._config);
      this.style.setProperty(
        "--picture-opacity",
        `${(background.opacity ?? 100) / 100}`
      );

      const backgroundImage =
        typeof background.image === "object"
          ? background.image.media_content_id
          : background.image;

      if (backgroundImage && isMediaSourceContentId(backgroundImage)) {
        resolveMediaSource(this.hass, backgroundImage).then((result) => {
          this._resolvedImage = result.url;
        });
      } else {
        this._resolvedImage = backgroundImage;
      }
    }
  }

  private _modeButtons = memoizeOne(
    (localize: LocalizeFunc): ToggleButton[] => [
      {
        value: "image",
        label: localize(
          "ui.panel.lovelace.editor.edit_view.background.type_image"
        ),
      },
      {
        value: "gradient",
        label: localize(
          "ui.panel.lovelace.editor.edit_view.background.type_gradient"
        ),
      },
    ]
  );

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <ha-button-toggle-group
        full-width
        .buttons=${this._modeButtons(this.hass.localize)}
        .active=${this._mode}
        @value-changed=${this._modeChanged}
      ></ha-button-toggle-group>

      ${this._mode === "gradient"
        ? html`<hui-view-gradient-editor
            .hass=${this.hass}
            .config=${this._config}
            @view-config-changed=${this._gradientConfigChanged}
          ></hui-view-gradient-editor>`
        : this._renderImageEditor()}
    `;
  }

  private _renderImageEditor() {
    const background = this._backgroundData(this._config);

    return html`
      ${this._resolvedImage
        ? html`<div class="previewContainer">
            <img
              src=${this._resolvedImage}
              alt=${this.hass.localize(
                "ui.components.picture-upload.current_image_alt"
              )}
            />
          </div>`
        : nothing}
      <ha-form
        .hass=${this.hass}
        .data=${background}
        .schema=${this._schema(this.hass.localize, true)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
        .localizeValue=${this._localizeValueCallback}
      ></ha-form>
    `;
  }

  private _backgroundData = memoizeOne(
    (backgroundConfig?: LovelaceViewConfig) => {
      let background = backgroundConfig?.background;
      if (typeof background === "string") {
        const backgroundUrl = background.match(
          /url\(['"]?([^'"]+)['"]?\)/
        )?.[1];

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
          ...(typeof background.image === "string"
            ? { image: { media_content_id: background.image } }
            : {}),
        };
      }
      return background;
    }
  );

  private _modeChanged(ev: CustomEvent): void {
    this._mode = ev.detail.value as BackgroundMode;
    if (this._mode === "gradient") {
      import("./hui-view-gradient-editor");
    }
  }

  private _gradientConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (ev.detail?.config) {
      fireEvent(this, "view-config-changed", { config: ev.detail.config });
    }
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
    ha-button-toggle-group {
      margin-bottom: 16px;
    }
    .previewContainer {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    img {
      max-width: 100%;
      max-height: 200px;
      margin-bottom: 4px;
      border-radius: var(--file-upload-image-border-radius);
      transition: opacity 0.3s;
      opacity: var(--picture-opacity, 1);
    }
    img:hover {
      opacity: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-background-editor": HuiViewBackgroundEditor;
  }
}
