import { LitElement, html } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import yaml from "js-yaml";

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";

import { Lovelace } from "./types";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";

const TAB_INSERT = "  ";

class LovelaceFullConfigEditor extends hassLocalizeLitMixin(LitElement) {
  public lovelace?: Lovelace;
  public closeEditor?: () => void;
  private _haStyle?: DocumentFragment;

  static get properties() {
    return {
      lovelace: {},
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
          </app-toolbar>
        </app-header>
        <div class="content">
          <textarea
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          ></textarea>
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
        app-toolbar {
          background-color: #455a64;
        }
        paper-button {
          font-size: 16px;
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
      </style>
    `;
  }

  private _handleSave() {
    let value;
    try {
      value = yaml.safeLoad(this.textArea.value);
    } catch (err) {
      alert(`Unable to parse YAML: ${err}`);
      return;
    }

    this.lovelace!.saveConfig(value);
  }

  private get textArea(): HTMLTextAreaElement {
    return this.shadowRoot!.querySelector("textarea")!;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-editor": LovelaceFullConfigEditor;
  }
}

customElements.define("hui-editor", LovelaceFullConfigEditor);
