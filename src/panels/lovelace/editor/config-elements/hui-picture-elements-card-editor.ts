import memoizeOne from "memoize-one";
import type { CSSResultGroup } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  object,
  optional,
  string,
  type,
} from "superstruct";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import type { HomeAssistant } from "../../../../types";
import type { PictureElementsCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { EditDetailElementEvent, SubElementEditorConfig } from "../types";
import { configElementStyle } from "./config-elements-style";
import "../hui-picture-elements-card-row-editor";
import type { LovelaceElementConfig } from "../../elements/types";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LocalizeFunc } from "../../../../common/translations/localize";

const genericElementConfigStruct = type({
  type: string(),
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    image: optional(string()),
    camera_image: optional(string()),
    camera_view: optional(string()),
    elements: array(genericElementConfigStruct),
    title: optional(string()),
    state_filter: optional(any()),
    theme: optional(string()),
    dark_mode_image: optional(string()),
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

  public setConfig(config: PictureElementsCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
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
            { name: "image", selector: { image: {} } },
            { name: "dark_mode_image", selector: { image: {} } },
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
      return html`
        <hui-sub-element-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubElementChanged}
        >
        </hui-sub-element-editor>
      `;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema(this.hass.localize)}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._formChanged}
      ></ha-form>
      <hui-picture-elements-card-row-editor
        .hass=${this.hass}
        .elements=${this._config.elements}
        @elements-changed=${this._elementsChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-picture-elements-card-row-editor>
    `;
  }

  private _formChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _elementsChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const oldLength = this._config?.elements?.length || 0;
    const config = {
      ...this._config,
      elements: ev.detail.elements as LovelaceElementConfig[],
    } as LovelaceCardConfig;

    fireEvent(this, "config-changed", { config });

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

  private _handleSubElementChanged(ev: CustomEvent): void {
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

    fireEvent(this, "config-changed", { config: this._config });
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

  private _handleImageClick = (ev: CustomEvent<{ x: number; y: number }>) => {
    const { x, y } = ev.detail;

    // Only handle clicks when actively editing an element
    if (
      !this._subElementEditorConfig?.elementConfig ||
      this._subElementEditorConfig.type !== "element"
    ) {
      return;
    }

    const elementConfig = this._subElementEditorConfig
      .elementConfig as LovelaceElementConfig;
    const newElement = {
      ...elementConfig,
      style: {
        ...(elementConfig.style || {}),
        left: `${Math.round(x)}%`,
        top: `${Math.round(y)}%`,
      },
    };

    const updateEvent = new CustomEvent("config-changed", {
      detail: { config: newElement },
    });
    updateEvent.stopPropagation = () => undefined;
    this._handleSubElementChanged(updateEvent);
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("picture-elements-clicked", this._handleImageClick);
  }

  disconnectedCallback() {
    window.removeEventListener(
      "picture-elements-clicked",
      this._handleImageClick
    );
    super.disconnectedCallback();
  }

  static get styles(): CSSResultGroup {
    return [configElementStyle];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card-editor": HuiPictureElementsCardEditor;
  }

  interface WindowEventMap {
    "picture-elements-clicked": CustomEvent<{ x: number; y: number }>;
  }
}
