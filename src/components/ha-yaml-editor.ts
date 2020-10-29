import { safeDump, safeLoad } from "js-yaml";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { afterNextRender } from "../common/util/render-status";
import "./ha-code-editor";
import type { HaCodeEditor } from "./ha-code-editor";

declare global {
  // for fire event
  interface HASSDomEvents {
    "editor-refreshed": undefined;
  }
}

const isEmpty = (obj: Record<string, unknown>): boolean => {
  if (typeof obj !== "object") {
    return false;
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
};

@customElement("ha-yaml-editor")
export class HaYamlEditor extends LitElement {
  @property() public value?: any;

  @property() public defaultValue?: any;

  @property() public isValid = true;

  @property() public label?: string;

  @internalProperty() private _yaml = "";

  @query("ha-code-editor", true) private _editor?: HaCodeEditor;

  public setValue(value): void {
    try {
      this._yaml = value && !isEmpty(value) ? safeDump(value) : "";
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert(`There was an error converting to YAML: ${err}`);
    }
    afterNextRender(() => {
      if (this._editor?.codemirror) {
        this._editor.codemirror.refresh();
      }
      afterNextRender(() => fireEvent(this, "editor-refreshed"));
    });
  }

  protected firstUpdated(): void {
    if (this.defaultValue) {
      this.setValue(this.defaultValue);
    }
  }

  protected render(): TemplateResult {
    if (this._yaml === undefined) {
      return html``;
    }
    return html`
      ${this.label ? html` <p>${this.label}</p> ` : ""}
      <ha-code-editor
        .value=${this._yaml}
        mode="yaml"
        .error=${this.isValid === false}
        @value-changed=${this._onChange}
      ></ha-code-editor>
    `;
  }

  private _onChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    let parsed;
    let isValid = true;

    if (value) {
      try {
        parsed = safeLoad(value);
      } catch (err) {
        // Invalid YAML
        isValid = false;
      }
    } else {
      parsed = {};
    }

    this.value = parsed;
    this.isValid = isValid;

    fireEvent(this, "value-changed", { value: parsed, isValid } as any);
  }

  get yaml() {
    return this._editor?.value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-yaml-editor": HaYamlEditor;
  }
}
