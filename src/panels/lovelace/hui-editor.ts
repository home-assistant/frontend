import { LitElement, html } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap";
import { TemplateResult } from "lit-html";
import yaml from "js-yaml";

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-input/paper-textarea.js";
// tslint:disable-next-line:no-duplicate-imports
import { PaperTextareaElement } from "@polymer/paper-input/paper-textarea.js";

import { Lovelace } from "./types";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";

import "../../components/ha-icon";

const TAB_INSERT = "  ";

class LovelaceFullConfigEditor extends hassLocalizeLitMixin(LitElement) {
  public lovelace?: Lovelace;
  public closeEditor?: () => void;
  private _haStyle?: DocumentFragment;
  private _saving?: boolean;
  private _changed?: boolean;

  static get properties() {
    return {
      lovelace: {},
      _saving: {},
      _changed: {},
    };
  }

  public render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <app-header-layout>
        <app-header>
          <app-toolbar>
            <paper-icon-button
              icon="hass:close"
              @click="${this.closeEditor}"
            ></paper-icon-button>
            <div main-title>Edit Config</div>
            <paper-button @click="${this._handleSave}">Save</paper-button>
            <ha-icon class="save-button ${classMap({
              saved: this._saving! === false && !this._changed!,
            })}" icon="hass:check">
          </app-toolbar>
        </app-header>
        <div class="content">
          <paper-textarea
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @value-changed="${this._yamlChanged}"
          ></paper-textarea>
        </div>
      </app-header-layout>
    `;
  }

  protected firstUpdated() {
    const textArea = this.textArea;
    textArea.value = yaml.safeDump(this.lovelace!.config);
    textArea.addEventListener("keydown", (e) => {
      if (e.keyCode !== 9) {
        return;
      }

      e.preventDefault();

      // tab was pressed, get caret position/selection
      const val = textArea.value;
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;

      // set textarea value to: text before caret + tab + text after caret
      textArea.value =
        val.substring(0, start) + TAB_INSERT + val.substring(end);

      // put caret at right position again
      textArea.selectionStart = textArea.selectionEnd =
        start + TAB_INSERT.length;
    });
  }

  protected renderStyle() {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }

    return html`
      ${this._haStyle}
      <style>
        app-header-layout {
          height: 100vh;
        }
        paper-button {
          font-size: 16px;
        }
        app-toolbar {
          background-color: var(--dark-background-color, #455a64);
          color: var(--dark-text-color);
        }

        .content {
          height: calc(100vh - 68px);
        }

        textarea {
          box-sizing: border-box;
          height: 100%;
          width: 100%;
          resize: none;
          border: 0;
          outline: 0;
          font-size: 12pt;
          font-family: "Courier New", Courier, monospace;
          padding: 8px;
        }

        .save-button {
          opacity: 0;
          margin-left: -16px;
          margin-top: -4px;
          transition: opacity 1.5s;
        }

        .saved {
          opacity: 1;
        }
      </style>
    `;
  }

  private async _handleSave() {
    this._saving = true;
    let value;
    try {
      value = yaml.safeLoad(this.textArea.value);
    } catch (err) {
      alert(`Unable to parse YAML: ${err}`);
      this._saving = false;
      return;
    }

    try {
      await this.lovelace!.saveConfig(value);
    } catch (err) {
      alert(`Unable to save YAML: ${err}`);
    }
    this._saving = false;
    this._changed = false;
  }

  private _yamlChanged() {
    if (this._changed) {
      return;
    }
    this._changed = true;
  }

  private get textArea(): PaperTextareaElement {
    return this.shadowRoot!.querySelector("paper-textarea")!;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-editor": LovelaceFullConfigEditor;
  }
}

customElements.define("hui-editor", LovelaceFullConfigEditor);
