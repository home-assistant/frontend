import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  dynamic,
  enums,
  literal,
  number,
  object,
  optional,
  string,
  type,
  union,
} from "superstruct";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { customType } from "../../../../common/structs/is-custom-type";
import "../../../../components/ha-card";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import { isCustomType } from "../../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesCardConfig } from "../../cards/types";
import { TIMESTAMP_RENDERING_FORMATS } from "../../components/types";
import type { LovelaceRowConfig } from "../../entity-rows/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import type { LovelaceCardEditor } from "../../types";
import "../hui-sub-element-editor";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { buttonEntityConfigStruct } from "../structs/button-entity-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import {
  EditorTarget,
  EditSubElementEvent,
  SubElementEditorConfig,
} from "../types";
import { configElementStyle } from "./config-elements-style";

const stateBadgeElementConfigStruct = object({
  type: literal("state-badge"),
  entity: optional(string()),
  style: optional(any()),
  title: optional(string()),
  tap_action: optional(actionConfigStruct),
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const conditionalElementRowConfigStruct = object({
  type: literal("conditional"),
  row: any(),
  conditions: array(
    object({
      entity: string(),
      state: optional(string()),
      state_not: optional(string()),
    })
  ),
});

// const customEntitiesRowConfigStruct = type({
//   type: customType(),
// });

const elementRowConfigStruct = dynamic<any>((value) => {
  if (value && typeof value === "object" && "type" in value) {
    // if (isCustomType((value as LovelaceRowConfig).type!)) {
    //   return customEntitiesRowConfigStruct;
    // }

    switch ((value as LovelaceRowConfig).type!) {
      case "state-badge": {
        return stateBadgeElementConfigStruct;
      }
    }
  }

  // No "type" property => has to be the default entity row config struct
  // return entitiesConfigStruct;
  return null;
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
  { name: "image", selector: { text: {} } },
  { name: "dark_mode_image", selector: { text: {} } },
  { name: "camera_image", selector: { entity: { domain: "camera" } } },
  { name: "camera_view", selector: { select: { options: ["auto", "live"] } } },
  { name: "theme", selector: { theme: {} } },
  { name: "state_filter", selector: { object: {} } },
  { name: "dark_mode_filter", selector: { object: {} } },
] as const;



@customElement("hui-picture-elements-card-editor")
export class HuiPictureElementsCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PictureElementsCardConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: PictureElemenentsCardConfig): void {
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
        @value-changed=${this._valueChanged}
      ></ha-form>
      <hui-entities-card-row-editor
        .hass=${this.hass}
        .entities=${this._configEntities}
        @entities-changed=${this._valueChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-entities-card-row-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _handleSubElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const configValue = this._subElementEditorConfig?.type;
    const value = ev.detail.config;

    if (configValue === "row") {
      const newConfigEntities = this._configEntities!.concat();
      if (!value) {
        newConfigEntities.splice(this._subElementEditorConfig!.index!, 1);
        this._goBack();
      } else {
        newConfigEntities[this._subElementEditorConfig!.index!] = value;
      }

      this._config = { ...this._config!, entities: newConfigEntities };
      this._configEntities = processEditorEntities(this._config!.entities);
    } else if (configValue) {
      if (value === "") {
        this._config = { ...this._config };
        delete this._config[configValue!];
      } else {
        this._config = {
          ...this._config,
          [configValue]: value,
        };
      }
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
