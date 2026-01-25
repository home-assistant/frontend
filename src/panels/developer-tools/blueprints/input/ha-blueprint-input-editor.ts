import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-yaml-editor";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  BlueprintInput,
  BlueprintInputSection,
} from "../../../../data/blueprint";
import { dynamicElement } from "../../../../common/dom/dynamic-element-directive";
import { query } from "lit/decorators.js";
import { HaYamlEditor } from "../../../../components/ha-yaml-editor";

@customElement("ha-blueprint-input-editor")
export default class HaBlueprintInputEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) input!:
    | BlueprintInput
    | BlueprintInputSection
    | null;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public yamlMode = false;

  @query("ha-yaml-editor")
  public yamlEditor?: HaYamlEditor;

  private _inputIsSection(x: any): x is BlueprintInputSection {
    return "input" in x;
  }

  protected render() {
    if (!this.input) {
      return nothing;
    }

    if (this.yamlMode) {
      return html`
        <ha-yaml-editor
          .hass=${this.hass}
          .defaultValue=${this.input}
          @value-changed=${this._onYamlChange}
          .readOnly=${this.disabled}
        ></ha-yaml-editor>
      `;
    }

    return dynamicElement(
      `ha-blueprint-input-${this._inputIsSection(this.input) ? "section" : "input"}`,
      {
        hass: this.hass,
        narrow: this.narrow,
        input: this.input,
        disabled: this.disabled,
      }
    );
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }

  static styles = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-editor": HaBlueprintInputEditor;
  }
}
