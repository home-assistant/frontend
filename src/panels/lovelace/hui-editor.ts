import { LitElement, html, TemplateResult } from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import yaml from "js-yaml";

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner";

import { struct } from "./common/structs/struct";
import { Lovelace } from "./types";
import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";

import "../../components/ha-icon";

const TAB_INSERT = "  ";

const lovelaceStruct = struct.interface({
  title: "string?",
  views: ["object"],
  resources: struct.optional(["object"]),
});

class LovelaceFullConfigEditor extends hassLocalizeLitMixin(LitElement) {
  public lovelace?: Lovelace;
  public closeEditor?: () => void;
  private _haStyle?: DocumentFragment;
  private _saving?: boolean;
  private _changed?: boolean;
  private _hashAdded?: boolean;
  private _hash?: boolean;

  static get properties() {
    return {
      lovelace: {},
      _saving: {},
      _changed: {},
      _hashAdded: {},
      _hash: {},
    };
  }

  public render(): TemplateResult | void {
    return html`
      ${this.renderStyle()}
      <app-header-layout>
        <app-header>
          <app-toolbar>
            <paper-icon-button
              icon="hass:close"
              @click="${this._closeEditor}"
            ></paper-icon-button>
            <div main-title>Edit Config</div>
            ${
              this._hash
                ? html`
                    <span class="comments">Comments will be not be saved!</span>
                  `
                : ""
            }
            <paper-button @click="${this._handleSave}">Save</paper-button>
            <ha-icon
              class="save-button
            ${
                classMap({
                  saved: this._saving! === false || this._changed === true,
                })
              }"
              icon="${this._changed ? "hass:circle-medium" : "hass:check"}"
            ></ha-icon>
          </app-toolbar>
        </app-header>
        <div class="content">
          <textarea
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @input="${this._yamlChanged}"
          ></textarea>
        </div>
      </app-header-layout>
    `;
  }

  protected firstUpdated() {
    const textArea = this.textArea;
    textArea.value = yaml.safeDump(this.lovelace!.config);
    textArea.addEventListener("keydown", (e) => {
      if (e.keyCode === 51) {
        this._hashAdded = true;
        return;
      }

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

        .comments {
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

  private _closeEditor() {
    if (this._changed) {
      if (
        !confirm("You have unsafed changes, are you sure you want to exit?")
      ) {
        return;
      }
    }
    window.onbeforeunload = null;
    this.closeEditor!();
  }

  private async _handleSave() {
    this._saving = true;

    if (this._hashAdded) {
      if (
        !confirm(
          "Your config might contain comments, these will not be saved. Do you want to continue?"
        )
      ) {
        return;
      }
    }

    let value;
    try {
      value = yaml.safeLoad(this.textArea.value);
    } catch (err) {
      alert(`Unable to parse YAML: ${err}`);
      this._saving = false;
      return;
    }
    try {
      value = lovelaceStruct(value);
    } catch (err) {
      alert(`Your config is not valid: ${err}`);
      return;
    }
    try {
      await this.lovelace!.saveConfig(value);
    } catch (err) {
      alert(`Unable to save YAML: ${err}`);
    }
    window.onbeforeunload = null;
    this._saving = false;
    this._changed = false;
    this._hashAdded = false;
  }

  private _yamlChanged() {
    this._hash = this._hashAdded || this.textArea.value.includes("#");
    if (this._changed) {
      return;
    }
    window.onbeforeunload = () => {
      return true;
    };
    this._changed = true;
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
