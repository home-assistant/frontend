import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  literal,
  object,
  optional,
  string,
} from "superstruct";
import { HASSDomEvent, fireEvent } from "../../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";
import { LovelacePictureElementEditor } from "../../../types";
import {
  ConditionalElementConfig,
  LovelaceElementConfig,
} from "../../../elements/types";
import "../../conditions/ha-card-conditions-editor";
import "../../hui-picture-elements-card-row-editor";
import { LovelaceCardConfig } from "../../../../../data/lovelace/config/card";
import { EditSubElementEvent, SubElementEditorConfig } from "../../types";
import "../../hui-sub-element-editor";
import { SchemaUnion } from "../../../../../components/ha-form/types";

const conditionalElementConfigStruct = object({
  type: literal("conditional"),
  conditions: optional(array(any())),
  elements: optional(array(any())),
  title: optional(string()),
});

const SCHEMA = [{ name: "title", selector: { text: {} } }] as const;

@customElement("hui-conditional-element-editor")
export class HuiConditionalElementEditor
  extends LitElement
  implements LovelacePictureElementEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ConditionalElementConfig;

  @state() private _subElementEditorConfig?: SubElementEditorConfig;

  public setConfig(config: ConditionalElementConfig): void {
    assert(config, conditionalElementConfigStruct);
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
      <ha-card-conditions-editor
        .hass=${this.hass}
        .conditions=${this._config.conditions || []}
        @value-changed=${this._conditionChanged}
      >
      </ha-card-conditions-editor>
      <hui-picture-elements-card-row-editor
        .hass=${this.hass}
        .elements=${this._config.elements || []}
        @elements-changed=${this._elementsChanged}
        @edit-detail-element=${this._editDetailElement}
      ></hui-picture-elements-card-row-editor>
    `;
  }

  private _formChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const conditions = ev.detail.value;
    this._config = { ...this._config, conditions };
    fireEvent(this, "config-changed", { config: this._config });
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

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }

  private _goBack(ev?): void {
    ev?.stopPropagation();
    this._subElementEditorConfig = undefined;
  }

  private _computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    ) ||
    this.hass!.localize(`ui.panel.lovelace.editor.elements.${schema.name}`) ||
    schema.name;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-element-editor": HuiConditionalElementEditor;
  }
}
