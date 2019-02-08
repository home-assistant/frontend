import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

import { EditorTarget } from "../editor/types";

export class HuiInputListEditor extends LitElement {
  protected hass?: HomeAssistant;
  protected heading?: string;
  protected entries?: string[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      heading: {},
      entries: {},
    };
  }

  protected render(): TemplateResult | void {
    if (!this.entries) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <h3>${this.heading}</h3>
      <div class="entries">
        ${this.entries.map((listEntry, index) => {
          return html`
            <paper-input
              label="Source"
              .value="${listEntry}"
              .configValue="${"entry"}"
              .index="${index}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          `;
        })}
        <paper-input @value-changed="${this._addEntity}"></paper-input>
      </div>
    `;
  }

  private _addEntity(ev: Event): void {
    const target = ev.target! as EditorTarget;
    if (target.value === "") {
      return;
    }
    const newConfigEntries = this.entries!.concat(target.value as string);
    target.value = "";
    this.value = newConfigEntries;
    fireEvent(this, "entries-changed");
  }

  private _valueChanged(ev: Event): void {
    const target = ev.target! as EditorTarget;
    const newConfigEntries = this.entries!.concat();

    if (target.value === "") {
      newConfigEntries.splice(target.index!, 1);
    } else {
      newConfigEntries[target.index!] = target.value!;
    }

    this.value = newConfigEntries;
    fireEvent(this, "entries-changed");
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .entries {
          padding-left: 20px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-list-editor": HuiInputListEditor;
  }
}

customElements.define("hui-input-list-editor", HuiInputListEditor);
