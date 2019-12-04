import { safeDump, safeLoad } from "js-yaml";
import "./ha-code-editor";
import { LitElement, property, customElement, html } from "lit-element";
import { fireEvent } from "../common/dom/fire_event";

const isEmpty = (obj: object) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};

@customElement("ha-yaml-editor")
export class HaYamlEditor extends LitElement {
  @property() public value?: any;
  @property() public isValid = true;
  @property() public label?: string;
  @property() private _yaml?: string;

  protected firstUpdated() {
    try {
      this._yaml =
        this.value && !isEmpty(this.value) ? safeDump(this.value) : "";
    } catch (err) {
      alert(`There was an error converting to YAML: ${err}`);
    }
  }

  protected render() {
    if (this._yaml === undefined) {
      return;
    }
    return html`
      ${this.label
        ? html`
            <p>${this.label}</p>
          `
        : ""}
      <ha-code-editor
        .value=${this._yaml}
        mode="yaml"
        .error=${this.isValid === false}
        @value-changed=${this._onChange}
      ></ha-code-editor>
    `;
  }

  private _onChange(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    let parsed;
    let isValid = true;

    if (value) {
      try {
        parsed = safeLoad(value);
        isValid = true;
      } catch (err) {
        // Invalid YAML
        isValid = false;
      }
    } else {
      parsed = {};
    }

    this.value = parsed;
    this.isValid = isValid;

    if (isValid) {
      fireEvent(this, "value-changed", { value: parsed });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-yaml-editor": HaYamlEditor;
  }
}
