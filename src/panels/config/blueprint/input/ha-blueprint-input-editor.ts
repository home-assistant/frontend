import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-yaml-editor";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { BlueprintInput } from "../../../../data/blueprint";
import "./types/ha-blueprint-input-default";

@customElement("ha-blueprint-input-editor")
export default class HaBlueprintInputEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) input!: BlueprintInput;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public yamlMode = false;

  protected render() {
    return html`
      ${this.yamlMode
        ? html`
            <ha-yaml-editor
              .hass=${this.hass}
              .defaultValue=${this.input}
              @value-changed=${this._onYamlChange}
              .readOnly=${this.disabled}
            ></ha-yaml-editor>
          `
        : html`
            <ha-blueprint-input-default
              .hass=${this.hass}
              .input=${this.input}
              .disabled=${this.disabled}
            >
            </ha-blueprint-input-default>
          `}
    `;
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    // @ts-ignore
    fireEvent(this, "value-changed", { value: ev.detail.value, yaml: true });
  }

  static styles = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-editor": HaBlueprintInputEditor;
  }
}
