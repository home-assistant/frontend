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
    this.textArea.value = yaml.safeDump(this.lovelace!.config);
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

        .content {
          height: calc(100vh - 64px);
        }

        textarea {
          height: calc(100% - 16px);
          width: 100%;
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

customElements.define("hui-editor", LovelaceFullConfigEditor);
