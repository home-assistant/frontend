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
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import "../../../../components/ha-textfield";
import "../../../../components/ha-theme-picker";
import { isCustomType } from "../../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesCardConfig } from "../../cards/types";
import { TIMESTAMP_RENDERING_FORMATS } from "../../components/types";
import type { LovelaceRowConfig } from "../../entity-rows/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import type { LovelaceCardEditor } from "../../types";
import "../header-footer-editor/hui-header-footer-editor";
import "../hui-entities-card-row-editor";
import "../hui-sub-element-editor";
import { processEditorEntities } from "../process-editor-entities";
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

const buttonEntitiesRowConfigStruct = object({
  type: literal("button"),
  entity: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  action_name: optional(string()),
  tap_action: actionConfigStruct,
  hold_action: optional(actionConfigStruct),
  double_tap_action: optional(actionConfigStruct),
});

const castEntitiesRowConfigStruct = object({
  type: literal("cast"),
  view: optional(union([string(), number()])),
  dashboard: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  hide_if_unavailable: optional(boolean()),
});

const callServiceEntitiesRowConfigStruct = object({
  type: literal("call-service"),
  name: string(),
  service: string(),
  icon: optional(string()),
  action_name: optional(string()),
  // "service_data" is kept for backwards compatibility. Replaced by "data".
  service_data: optional(any()),
  data: optional(any()),
});

const conditionalEntitiesRowConfigStruct = object({
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

const dividerEntitiesRowConfigStruct = object({
  type: literal("divider"),
  style: optional(any()),
});

const sectionEntitiesRowConfigStruct = object({
  type: literal("section"),
  label: optional(string()),
});

const webLinkEntitiesRowConfigStruct = object({
  type: literal("weblink"),
  url: string(),
  name: optional(string()),
  icon: optional(string()),
});

const buttonsEntitiesRowConfigStruct = object({
  type: literal("buttons"),
  entities: array(buttonEntityConfigStruct),
});

const attributeEntitiesRowConfigStruct = object({
  type: literal("attribute"),
  entity: string(),
  attribute: string(),
  prefix: optional(string()),
  suffix: optional(string()),
  name: optional(string()),
  icon: optional(string()),
  format: optional(enums(TIMESTAMP_RENDERING_FORMATS)),
});

const textEntitiesRowConfigStruct = object({
  type: literal("text"),
  name: string(),
  text: string(),
  icon: optional(string()),
});

const customEntitiesRowConfigStruct = type({
  type: customType(),
});

const entitiesRowConfigStruct = dynamic<any>((value) => {
  if (value && typeof value === "object" && "type" in value) {
    if (isCustomType((value as LovelaceRowConfig).type!)) {
      return customEntitiesRowConfigStruct;
    }

    switch ((value as LovelaceRowConfig).type!) {
      case "attribute": {
        return attributeEntitiesRowConfigStruct;
      }
      case "button": {
        return buttonEntitiesRowConfigStruct;
      }
      case "buttons": {
        return buttonsEntitiesRowConfigStruct;
      }
      case "call-service": {
        return callServiceEntitiesRowConfigStruct;
      }
      case "cast": {
        return castEntitiesRowConfigStruct;
      }
      case "conditional": {
        return conditionalEntitiesRowConfigStruct;
      }
      case "divider": {
        return dividerEntitiesRowConfigStruct;
      }
      case "section": {
        return sectionEntitiesRowConfigStruct;
      }
      case "text": {
        return textEntitiesRowConfigStruct;
      }
      case "weblink": {
        return webLinkEntitiesRowConfigStruct;
      }
    }
  }

  // No "type" property => has to be the default entity row config struct
  return entitiesConfigStruct;
});

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(union([string(), boolean()])),
    entity: optional(string()),
    theme: optional(string()),
    icon: optional(string()),
    show_header_toggle: optional(boolean()),
    state_color: optional(boolean()),
    entities: array(entitiesRowConfigStruct),
    header: optional(headerFooterConfigStructs),
    footer: optional(headerFooterConfigStructs),
  })
);

@customElement("hui-entities-card-editor")
export class HuiEntitiesCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardConfig;

  @state() private _configEntities?: LovelaceRowConfig[];

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: EntitiesCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  get _title(): string {
    return this._config!.title || "";
  }

  get _theme(): string {
    return this._config!.theme || "";
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
      <div class="card-config">
        <ha-textfield
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._title}
          .configValue=${"title"}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-theme-picker
          .hass=${this.hass}
          .value=${this._theme}
          .label=${`${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.theme"
          )} (${this.hass!.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})`}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></ha-theme-picker>
        <div class="side-by-side">
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.entities.show_header_toggle"
            )}
            .dir=${computeRTLDirection(this.hass)}
          >
            <ha-switch
              .checked=${this._config!.show_header_toggle !== false}
              .configValue=${"show_header_toggle"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.state_color"
            )}
            .dir=${computeRTLDirection(this.hass)}
          >
            <ha-switch
              .checked=${this._config!.state_color}
              .configValue=${"state_color"}
              @change=${this._valueChanged}
            ></ha-switch>
          </ha-formfield>
        </div>
        <hui-header-footer-editor
          .hass=${this.hass}
          .configValue=${"header"}
          .config=${this._config.header}
          @value-changed=${this._valueChanged}
          @edit-detail-element=${this._editDetailElement}
        ></hui-header-footer-editor>
        <hui-header-footer-editor
          .hass=${this.hass}
          .configValue=${"footer"}
          .config=${this._config.footer}
          @value-changed=${this._valueChanged}
          @edit-detail-element=${this._editDetailElement}
        ></hui-header-footer-editor>
      </div>
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

    const target = ev.target! as EditorTarget;
    const configValue =
      target.configValue || this._subElementEditorConfig?.type;
    const value =
      target.checked !== undefined
        ? target.checked
        : target.value || ev.detail.config || ev.detail.value;

    if (
      (configValue! === "title" && target.value === this._title) ||
      (configValue! === "theme" && target.value === this._theme)
    ) {
      return;
    }

    if (configValue === "row" || (ev.detail && ev.detail.entities)) {
      const newConfigEntities =
        ev.detail.entities || this._configEntities!.concat();
      if (configValue === "row") {
        if (!value) {
          newConfigEntities.splice(this._subElementEditorConfig!.index!, 1);
          this._goBack();
        } else {
          newConfigEntities[this._subElementEditorConfig!.index!] = value;
        }

        this._subElementEditorConfig!.elementConfig = value;
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

    fireEvent(this, "config-changed", { config: this._config });
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
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}
