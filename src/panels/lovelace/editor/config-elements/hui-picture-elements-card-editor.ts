import memoizeOne from "memoize-one";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
  type,
  union,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import {
  PICTURE_ELEMENTS_EDITOR_BRIDGE,
  PictureElementsEditorBridge,
} from "../../cards/picture-elements/editor-bridge";
import { isMovableElement } from "../../cards/picture-elements/movable-element";
import type { PictureElementsCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";
import type { UIConfigChangedEvent } from "../hui-element-editor";
import { configElementStyle } from "./config-elements-style";
import "../hui-picture-elements-card-row-editor";
import type { LovelaceElementConfig } from "../../elements/types";
import type { LocalizeFunc } from "../../../../common/translations/localize";

const genericElementConfigStruct = type({
  type: string(),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    image: optional(union([string(), object()])),
    camera_image: optional(string()),
    camera_view: optional(string()),
    elements: array(genericElementConfigStruct),
    title: optional(string()),
    state_filter: optional(any()),
    theme: optional(string()),
    dark_mode_image: optional(union([string(), object()])),
    dark_mode_filter: optional(any()),
  })
);

@customElement("hui-picture-elements-card-editor")
export class HuiPictureElementsCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureElementsCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  // Bumped when the preview moves an element, as the sub-editor's YAML mode
  // doesn't pick up outside changes.
  private _movedFromPreview = 0;

  public setConfig(config: PictureElementsCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    // The same config can come back without the bridge, so always check.
    this.requestUpdate();
  }

  private _bridge = new PictureElementsEditorBridge({
    selectElement: (index) => this._selectElement(index),
    moveElement: (index, left, top) =>
      this._setElementPosition(index, left, top),
    clickImage: (x, y) => {
      if (
        this._subElementEditorConfig?.type === "element" &&
        this._subElementEditorConfig.index !== undefined
      ) {
        this._setElementPosition(this._subElementEditorConfig.index, x, y);
      }
    },
  });

  public connectedCallback(): void {
    super.connectedCallback();
    this._updateBridge();
    // Back from the YAML editor, whose edits come without the bridge.
    this.requestUpdate();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // The YAML editor replaces this editor; the preview acts normally then.
    this._bridge.setState(false);
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("_subElementEditorConfig")) {
      this._updateBridge();
    }
    this._handOverBridge();
  }

  private _handOverBridge(): void {
    if (
      this.isConnected &&
      this._config &&
      this._bridge.needsHandOver(this._config)
    ) {
      this._fireConfigChanged(this._config);
    }
  }

  private _updateBridge(): void {
    this._bridge.setState(
      this.isConnected,
      this._subElementEditorConfig?.type === "element"
        ? this._subElementEditorConfig.index
        : undefined
    );
  }

  private _fireConfigChanged(config: PictureElementsCardConfig): void {
    fireEvent(this, "config-changed", {
      config: { ...config, [PICTURE_ELEMENTS_EDITOR_BRIDGE]: this._bridge },
    });
  }

  private _selectElement(index: number): void {
    const elementConfig = this._config?.elements[index];
    if (!elementConfig || this._subElementEditorConfig?.index === index) {
      return;
    }
    this._subElementEditorConfig = { index, type: "element", elementConfig };
  }

  // left/top are in percent of the image.
  private _setElementPosition(index: number, left: number, top: number): void {
    const elementConfig = this._config?.elements[index];
    if (!elementConfig || !isMovableElement(elementConfig)) {
      return;
    }
    const round = (value: number) => Math.round(value * 10) / 10;
    const newElement: LovelaceElementConfig = {
      ...elementConfig,
      style: {
        ...elementConfig.style,
        left: `${round(left)}%`,
        top: `${round(top)}%`,
      },
    };
    const elements = this._config!.elements.concat();
    elements[index] = newElement;
    this._config = { ...this._config!, elements };
    this._movedFromPreview++;
    this._subElementEditorConfig = {
      index,
      type: "element",
      elementConfig: newElement,
    };
    this._fireConfigChanged(this._config);
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "",
          type: "expandable",
          title: localize(
            "ui.panel.lovelace.editor.card.picture-elements.card_options"
          ),
          schema: [
            { name: "title", selector: { text: {} } },
            {
              name: "image",
              selector: {
                media: {
                  accept: ["image/*"] as string[],
                  image_upload: true,
                  hide_content_type: true,
                  content_id_helper: localize(
                    "ui.panel.lovelace.editor.card.picture.content_id_helper"
                  ),
                },
              },
            },
            {
              name: "dark_mode_image",
              selector: {
                media: {
                  accept: ["image/*"] as string[],
                  image_upload: true,
                  hide_content_type: true,
                  content_id_helper: localize(
                    "ui.panel.lovelace.editor.card.picture.content_id_helper"
                  ),
                },
              },
            },
            {
              name: "camera_image",
              selector: { entity: { domain: "camera" } },
            },
            {
              name: "camera_view",
              selector: {
                select: {
                  options: ["auto", "live"].map((value) => ({
                    value,
                    label: localize(
                      `ui.panel.lovelace.editor.card.generic.camera_view_options.${value}`
                    ),
                  })),
                  mode: "dropdown",
                },
              },
            },
            { name: "theme", selector: { theme: {} } },
            { name: "state_filter", selector: { object: {} } },
            { name: "dark_mode_filter", selector: { object: {} } },
          ],
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    if (this._subElementEditorConfig) {
      const elementConfig = this._subElementEditorConfig.elementConfig as
        LovelaceElementConfig | undefined;
      return html`
        ${
          this._subElementEditorConfig.type === "element" &&
          elementConfig &&
          isMovableElement(elementConfig)
            ? html`
                <ha-alert alert-type="info">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.card.picture-elements.move_hint"
                  )}
                </ha-alert>
              `
            : nothing
        }
        ${keyed(
          `${this._subElementEditorConfig.index}-${this._movedFromPreview}`,
          html`
            <hui-sub-element-editor
              .hass=${this.hass}
              .config=${this._subElementEditorConfig}
              @go-back=${this._goBack}
              @config-changed=${this._handleSubElementChanged}
            >
            </hui-sub-element-editor>
          `
        )}
      `;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._processData(this._config)}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._formChanged}
      ></ha-form>
      ${
        this._config.elements.length
          ? html`
              <ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.card.picture-elements.select_hint"
                )}
              </ha-alert>
            `
          : nothing
      }
      <hui-picture-elements-card-row-editor
        .hass=${this.hass}
        .elements=${this._config.elements}
        @elements-changed=${this._elementsChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-picture-elements-card-row-editor>
    `;
  }

  private _processData = memoizeOne((config: PictureElementsCardConfig) => ({
    ...config,
    ...(typeof config.image === "string"
      ? { image: { media_content_id: config.image } }
      : {}),
    ...(typeof config.dark_mode_image === "string"
      ? { dark_mode_image: { media_content_id: config.dark_mode_image } }
      : {}),
  }));

  private _formChanged(ev: ValueChangedEvent<PictureElementsCardConfig>): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    this._fireConfigChanged(ev.detail.value);
  }

  private _elementsChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const oldLength = this._config?.elements?.length || 0;
    const config = {
      ...this._config,
      elements: ev.detail.elements as LovelaceElementConfig[],
    } as PictureElementsCardConfig;

    this._fireConfigChanged(config);

    const newLength = ev.detail.elements?.length || 0;
    if (newLength === oldLength + 1) {
      const index = newLength - 1;
      this._subElementEditorConfig = {
        index,
        type: "element",
        elementConfig: { ...ev.detail.elements[index] },
      };
    }
  }

  private _handleSubElementChanged(
    ev: UIConfigChangedEvent<LovelaceElementConfig>
  ): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const configValue = this._subElementEditorConfig?.type;
    const value = ev.detail.config;

    if (configValue === "element") {
      const newConfigElements = this._config.elements!.concat();
      if (!value) {
        newConfigElements.splice(this._subElementEditorConfig!.index!, 1);
        this._goBack();
      } else {
        newConfigElements[this._subElementEditorConfig!.index!] = value;
      }

      this._config = { ...this._config!, elements: newConfigElements };
    }

    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: value,
    };

    this._fireConfigChanged(this._config);
  }

  private _editDetailElement(ev: HASSDomEvent<EditDetailElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _computeLabelCallback = (schema) => {
    switch (schema.name) {
      case "dark_mode_image":
      case "state_filter":
      case "dark_mode_filter":
        return (
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.picture-elements.${schema.name}`
          ) || schema.name
        );
      default:
        return (
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.generic.${schema.name}`
          ) || schema.name
        );
    }
  };

  static get styles(): CSSResultGroup {
    return [configElementStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card-editor": HuiPictureElementsCardEditor;
  }
}
