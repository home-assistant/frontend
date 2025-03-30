import { customElement, property } from "lit/decorators";
import { css, html, LitElement } from "lit";
import type { HomeAssistant } from "../../../../../types";
import type { BlueprintInput } from "../../../../../data/blueprint";
import "../../../../../components/ha-textarea";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-select";
import "@material/mwc-list/mwc-list-item";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/ha-selector/ha-selector";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HaSelect } from "../../../../../components/ha-select";
import type { HaTextField } from "../../../../../components/ha-textfield";

@customElement("ha-blueprint-input-default")
export class HaBlueprintInputDefault extends LitElement {
  public static get defaultConfig(): BlueprintInput {
    return {
      name: "",
      description: "",
      selector: { text: { type: "text" } },
      default: "",
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) input!: BlueprintInput;

  @property({ type: Boolean }) public disabled = false;

  private _propertyChanged(propertyName: string) {
    return (e: InputEvent) => {
      const target = e.currentTarget as HaTextField;
      fireEvent(this, "value-changed", {
        value: { ...this.input, [propertyName]: target.value },
      });
    };
  }

  private _selectorChanged(e: CustomEvent) {
    const type = (e.target as HaSelect).value;
    if (!type) {
      return;
    }

    fireEvent(this, "value-changed", {
      value: { ...this.input, selector: { [type]: {} } },
    });
  }

  private _selectorOptions(): [string, string][] {
    return [
      ["Action", "action"],
      ["Addon", "addon"],
      ["Area", "area"],
      ["Area Filter", "area_filter"],
      ["Attribute", "attribute"],
      ["Assist Pipeline", "assist_pipeline"],
      ["Boolean", "boolean"],
      ["Color", "color_rgb"],
      ["Condition", "condition"],
      ["Config Entry", "config_entry"],
      ["Conversation Agent", "conversation_agent"],
      ["Constant", "constant"],
      ["Country", "country"],
      ["Date", "date"],
      ["Date and Time", "datetime"],
      ["Device", "device"],
      ["Duration", "duration"],
      ["Entity", "entity"],
      ["Statistic", "statistic"],
      ["File", "file"],
      ["Floor", "floor"],
      ["Label", "label"],
      ["Image", "image"],
      ["Background", "background"],
      ["Language", "language"],
      ["Navigation", "navigation"],
      ["Number", "number"],
      ["Object", "object"],
      ["QR Code", "qr_code"],
      ["Select", "select"],
      ["Selector", "selector"],
      ["State", "state"],
      ["Backup Location", "backup_location"],
      ["STT", "stt"],
      ["Target", "target"],
      ["Template", "template"],
      ["Text", "text"],
      ["Time", "time"],
      ["Icon", "icon"],
      ["Media", "media"],
      ["Theme", "theme"],
      ["Button Toggle", "button_toggle"],
      ["Trigger", "trigger"],
      ["TTS", "tts"],
      ["TTS Voice", "tts_voice"],
      ["Location", "location"],
      ["Color Temperature", "color_temp"],
      ["UI Action", "ui_action"],
      ["UI Color", "ui_color"],
      ["UI State Content", "ui_state_content"],
    ];
  }

  protected render() {
    return html`
      <ha-textfield
        .value=${this.input.name}
        @input=${this._propertyChanged("name")}
        @change=${this._propertyChanged("name")}
        .label=${this.hass.localize(
          "ui.panel.config.blueprint.editor.inputs.name"
        )}
        .required=${false}
      ></ha-textfield>
      <ha-textarea
        .value=${this.input.description}
        @input=${this._propertyChanged("description")}
        @change=${this._propertyChanged("description")}
        .label=${this.hass.localize(
          "ui.panel.config.blueprint.editor.inputs.description"
        )}
        .required=${false}
      ></ha-textarea>
      <ha-select
        .label=${this.hass.localize(
          "ui.panel.config.blueprint.editor.inputs.selector"
        )}
        fixedMenuPosition
        naturalMenuWidth
        .value=${Object.keys(this.input.selector!)[0]}
        .disabled=${this.disabled}
        @selected=${this._selectorChanged}
        @closed=${stopPropagation}
        .required=${false}
      >
        ${this._selectorOptions().map(
          ([name, value]) => html`
            <mwc-list-item .value=${value}>${name}</mwc-list-item>
          `
        )}
      </ha-select>
      <!-- TODO: Sub-selector settings -->
      <!-- TODO: Sometimes throws errors -->
      <ha-selector
        .hass=${this.hass}
        .selector=${this.input.selector}
        .disabled=${this.disabled}
        .required=${false}
        .value=${this.input.default}
        label="Default Value"
        @value-changed=${this._propertyChanged("default")}
      ></ha-selector>
    `;
  }

  static styles = css`
    ha-textfield,
    ha-textarea,
    ha-select,
    ha-selector {
      display: block;
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-default": HaBlueprintInputDefault;
  }
}
