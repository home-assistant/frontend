import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  dynamic,
  literal,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import type { HomeAssistant } from "../../../../types";
import type { PictureElementsCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { EditSubElementEvent, SubElementEditorConfig } from "../types";
import { configElementStyle } from "./config-elements-style";
import "../hui-picture-elements-card-row-editor";
import { LovelaceElementConfig } from "../../elements/types";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";

const stateBadgeElementConfigStruct = object({
  type: literal("state-badge"),
  entity: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const stateIconElementConfigStruct = object({
  type: literal("state-icon"),
  entity: optional(string()),
  icon: optional(string()),
  state_color: optional(boolean()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const stateLabelElementConfigStruct = object({
  type: literal("state-label"),
  entity: optional(string()),
  attribute: optional(string()),
  prefix: optional(string()),
  suffix: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const serviceButtonElementConfigStruct = object({
  type: literal("service-button"),
  style: optional(any()),
  title: optional(string()),
  service: optional(string()),
  service_data: optional(any()),
});

const iconElementConfigStruct = object({
  type: literal("icon"),
  entity: optional(string()),
  icon: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const imageElementConfigStruct = object({
  type: literal("image"),
  entity: optional(string()),
  image: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
  camera_image: optional(string()),
  camera_view: optional(string()),
  state_image: optional(any()),
  filter: optional(string()),
  state_filter: optional(any()),
  aspect_ratio: optional(string()),
});

const conditionalElementConfigStruct = object({
  type: literal("conditional"),
  conditions: optional(array(any())),
  elements: optional(array(any())),
});

const elementRowConfigStruct = dynamic<any>((value) => {
  if (value && typeof value === "object" && "type" in value) {
    // if (isCustomType((value as LovelaceRowConfig).type!)) {
    //   return customEntitiesRowConfigStruct;
    // }

    switch ((value as LovelaceElementConfig).type!) {
      case "state-badge": {
        return stateBadgeElementConfigStruct;
      }
      case "state-icon": {
        return stateIconElementConfigStruct;
      }
      case "state-label": {
        return stateLabelElementConfigStruct;
      }
      case "service-button": {
        return serviceButtonElementConfigStruct;
      }
      case "icon": {
        return iconElementConfigStruct;
      }
      case "image": {
        return imageElementConfigStruct;
      }
      case "conditional": {
        return conditionalElementConfigStruct;
      }
    }
  }

  return stateBadgeElementConfigStruct;
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    image: optional(string()),
    camera_image: optional(string()),
    camera_view: optional(string()),
    elements: array(elementRowConfigStruct),
    title: optional(string()),
    state_filter: optional(any()),
    theme: optional(string()),
    dark_mode_image: optional(string()),
    dark_mode_filter: optional(any()),
  })
);

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  {
    name: "",
    type: "expandable",
    title: "Background",
    schema: [
      { name: "image", selector: { text: {} } },
      { name: "dark_mode_image", selector: { text: {} } },
      { name: "camera_image", selector: { entity: { domain: "camera" } } },
      {
        name: "camera_view",
        selector: { select: { options: ["auto", "live"] } },
      },
    ],
  },
  {
    name: "",
    type: "expandable",
    title: "Card Style",
    schema: [
      { name: "theme", selector: { theme: {} } },
      { name: "state_filter", selector: { object: {} } },
      { name: "dark_mode_filter", selector: { object: {} } },
    ],
  },
] as const;

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
        .schema=${SCHEMA}
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

    const config = {
      ...this._config,
      elements: ev.detail.elements as LovelaceElementConfig[],
    } as LovelaceCardConfig;

    fireEvent(this, "config-changed", { config });
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

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
    switch (schema.name) {
      default:
        return (
          this.hass!.localize(
            `ui.panel.lovelace.editor.card.generic.${schema.name}`
          ) || schema.name
        );
    }
  };

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        .edit-entity-row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 18px;
        }

        hui-header-footer-editor {
          padding-top: 4px;
        }

        ha-textfield {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card-editor": HuiPictureElementsCardEditor;
  }
}
