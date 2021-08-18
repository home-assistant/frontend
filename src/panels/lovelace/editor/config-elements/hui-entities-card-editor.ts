import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  boolean,
  assign,
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
import { entityId } from "../../../../common/structs/is-entity-id";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import type { HomeAssistant } from "../../../../types";
import type { EntitiesCardConfig } from "../../cards/types";
import "../../components/hui-theme-select-editor";
import type { LovelaceRowConfig } from "../../entity-rows/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import type { LovelaceCardEditor } from "../../types";
import "../header-footer-editor/hui-header-footer-editor";
import "../hui-entities-card-row-editor";
import "../hui-sub-element-editor";
import { processEditorEntities } from "../process-editor-entities";
import { actionConfigStruct } from "../structs/action-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import {
  EditorTarget,
  EditSubElementEvent,
  SubElementEditorConfig,
} from "../types";
import { configElementStyle } from "./config-elements-style";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

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
  view: union([string(), number()]),
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
  service_data: optional(any()),
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
  entities: array(
    union([
      object({
        entity: string(),
        name: optional(string()),
        icon: optional(string()),
        image: optional(string()),
        show_name: optional(boolean()),
        show_icon: optional(boolean()),
        tap_action: optional(actionConfigStruct),
        hold_action: optional(actionConfigStruct),
        double_tap_action: optional(actionConfigStruct),
      }),
      string(),
    ])
  ),
});

const attributeEntitiesRowConfigStruct = object({
  type: literal("attribute"),
  entity: string(),
  attribute: string(),
  prefix: optional(string()),
  suffix: optional(string()),
  name: optional(string()),
});

const textEntitiesRowConfigStruct = object({
  type: literal("text"),
  name: string(),
  text: string(),
  icon: optional(string()),
});

const customRowConfigStruct = type({
  type: customType(),
});

const entitiesRowConfigStruct = union([
  entitiesConfigStruct,
  buttonEntitiesRowConfigStruct,
  castEntitiesRowConfigStruct,
  conditionalEntitiesRowConfigStruct,
  dividerEntitiesRowConfigStruct,
  sectionEntitiesRowConfigStruct,
  webLinkEntitiesRowConfigStruct,
  buttonsEntitiesRowConfigStruct,
  attributeEntitiesRowConfigStruct,
  callServiceEntitiesRowConfigStruct,
  textEntitiesRowConfigStruct,
  customRowConfigStruct,
]);

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    title: optional(union([string(), boolean()])),
    entity: optional(entityId()),
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

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
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
        <paper-input
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._title}
          .configValue=${"title"}
          @value-changed=${this._valueChanged}
        ></paper-input>
        <hui-theme-select-editor
          .hass=${this.hass}
          .value=${this._theme}
          .configValue=${"theme"}
          @value-changed=${this._valueChanged}
        ></hui-theme-select-editor>
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-editor": HuiEntitiesCardEditor;
  }
}
