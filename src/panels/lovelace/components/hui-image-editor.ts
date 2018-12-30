import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon";

import { HomeAssistant } from "../../../types";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { EditorTarget } from "../editor/types";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { configElementStyle } from "../editor/config-elements/config-elements-style";

declare global {
  // for fire event
  interface HASSDomEvents {
    "value-changed": undefined;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "value-changed": HASSDomEvent<undefined>;
  }
}

export interface StateImage {
  key: string;
  value: string;
}

export class HuiImageEditor extends LitElement {
  public value?: string | { [key: string]: string };
  public images?: string[];
  public configValue?: string;
  protected hass?: HomeAssistant;

  static get properties(): PropertyDeclarations {
    return { hass: {}, value: {}, images: {}, configValue: {} };
  }

  get _value(): string | { [key: string]: string } {
    return this.value || "";
  }

  get _configValue(): string {
    return this.configValue || "image";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.images) {
      return html``;
    }

    const states: StateImage[] = [];
    Object.keys(this._value).forEach((key) => {
      states.push({ key, value: this._value[key] });
    });
    return html`
    ${configElementStyle} ${this.renderStyle()}
      <paper-dropdown-menu
        label=Image Type"
        .configValue="${"image_type"}"
        @value-changed="${this._typeChanged}"
      >
        <paper-listbox
          slot="dropdown-content"
          .selected="${this.images.indexOf(this._configValue!)}"
        >
          ${this.images.map((action) => {
            return html`
              <paper-item>${action}</paper-item>
            `;
          })}
        </paper-listbox>
      </paper-dropdown-menu>
      ${
        this._configValue === "image"
          ? html`
              <paper-input
                label="Image Url"
                .value="${this._value}"
                .configValue="${"image"}"
                @value-changed="${this._valueChanged}"
              ></paper-input>
            `
          : ""
      }
      ${
        this._configValue === "camera_image"
          ? html`
              <ha-entity-picker
                .hass="${this.hass}"
                .value="${this._value}"
                .configValue=${"camera_image"}
                domain-filter="camera"
                @change="${this._valueChanged}"
              ></ha-entity-picker>
            `
          : ""
      }
      ${
        this._configValue === "state_image"
          ? html`
              <h3>State Images</h3>
              ${
                states.map((state, index) => {
                  return html`
                    <div class="state">
                      <paper-input
                        class="key"
                        label="State"
                        .value="${state.key}"
                        .index="${index}"
                        .key="${state.key}"
                        .val="${state.value}"
                        .configValue="${"key"}"
                        @value-changed="${this._stateImageChanged}"
                        no-label-float
                      ></paper-input>
                      <paper-input
                        class="value"
                        label="Image Url"
                        .value="${state.value}"
                        .index="${index}"
                        .key="${state.key}"
                        .val="${state.value}"
                        .configValue="${"value"}"
                        @value-changed="${this._stateImageChanged}"
                        no-label-float
                      ></paper-input>
                      <ha-icon
                        class="removeState"
                        @click="${this._removeState}"
                        icon="hass:delete"
                        title="Remove State Image"
                        .value="${state.key}"
                      >
                      </ha-icon>
                    </div>
                  `;
                })
              }
              <div class="stateInput">
                <paper-input
                  class="key"
                  id="keyInput"
                  label="State"
                ></paper-input>
                <paper-input
                  class="value"
                  id="valueInput"
                  label="Image Url"
                ></paper-input>
                <ha-icon
                  class="addState"
                  .configValue="${"state_image"}"
                  @click="${this._valueChanged}"
                  icon="hass:plus"
                  title="Add State Image"
                >
                </ha-icon>
              </div>
            `
          : ""
      }
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .state > paper-input {
          --paper-input-container-underline: {
            display: none;
          }
          --paper-input-container-underline-focus: {
            display: none;
          }
          --paper-input-container-underline-disabled: {
            display: none;
          }
          position: relative;
          top: 1px;
        }
        .state {
          display: flex;
        }
        .stateInput {
          display: flex;
        }
        .key {
          flex: 2;
          padding-right: 4px;
        }
        .value {
          flex: 6;
          padding-right: 4px;
        }
        .addState .removeState {
          flex: 1;
          cursor: pointer;
        }
        .addState {
          padding-top: 27px;
        }
        .removeState {
          padding-top: 8px;
        }
      </style>
    `;
  }

  private _keyInput(): PaperInputElement {
    return this.shadowRoot!.getElementById("keyInput") as PaperInputElement;
  }

  private _valueInput(): PaperInputElement {
    return this.shadowRoot!.getElementById("valueInput") as PaperInputElement;
  }

  private _stateImageChanged(ev: Event): void {
    if (!this.value) {
      return;
    }
    const target = ev.target! as EditorTarget;
    delete this.value[target.key!];
    if (target.configValue === "key") {
      if (target.value === target.key) {
        return;
      }
      this.value[target.value!] = target.val;
    } else {
      if (target.value === target.val) {
        return;
      }
      this.value[target.key!] = target.value;
    }
    fireEvent(this, "value-changed");
  }

  private _removeState(ev: Event): void {
    if (!this.value) {
      return;
    }
    const target = ev.target! as EditorTarget;
    delete this.value[target.value!];
    fireEvent(this, "value-changed");
  }

  private _typeChanged(ev: Event): void {
    const target = ev.target! as EditorTarget;
    console.log("type-changed");
    if (!this.hass || this.configValue === target.value) {
      console.log("returned");
      return;
    }
    this.configValue = target.value;
    this.value = this.configValue === "state_image" ? {} : "";
    fireEvent(this, "value-changed");
  }

  private _valueChanged(ev: Event): void {
    if (!this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    if (this.configValue === "state_image") {
      if (
        this._keyInput().value === "" ||
        this._valueInput().value === "" ||
        this._value[this._keyInput().value!] === this._valueInput().value
      ) {
        return;
      }
      const data = this._value;
      data[this._keyInput().value!] = this._valueInput().value;
      this.value = data;
      this._keyInput().value = "";
      this._valueInput().value = "";
    } else {
      if (this._value === target.value) {
        return;
      }
      this.value = target.value;
    }
    fireEvent(this, "value-changed");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image-editor": HuiImageEditor;
  }
}

customElements.define("hui-image-editor", HuiImageEditor);
