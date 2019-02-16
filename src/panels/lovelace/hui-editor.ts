import { LitElement, html, TemplateResult, CSSResult, css } from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import yaml from "js-yaml";

import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-spinner/paper-spinner";

import { struct } from "./common/structs/struct";
import { Lovelace } from "./types";

import "../../components/ha-icon";
import { haStyle } from "../../resources/styles";
import "./components/hui-yaml-editor";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiYamlEditor } from "./components/hui-yaml-editor";
import { HomeAssistant } from "../../types";

const lovelaceStruct = struct.interface({
  title: "string?",
  views: ["object"],
  resources: struct.optional(["object"]),
});

class LovelaceFullConfigEditor extends LitElement {
  public hass?: HomeAssistant;
  public lovelace?: Lovelace;
  public closeEditor?: () => void;
  private _saving?: boolean;
  private _changed?: boolean;
  private _generation?: number;

  static get properties() {
    return {
      hass: {},
      lovelace: {},
      _saving: {},
      _changed: {},
    };
  }

  public render(): TemplateResult | void {
    return html`
      <app-header-layout>
        <app-header>
          <app-toolbar>
            <paper-icon-button
              icon="hass:close"
              @click="${this._closeEditor}"
            ></paper-icon-button>
            <div main-title>Edit Config</div>
            <mwc-button raised @click="${this._handleSave}"
              >Save
              <ha-icon
                class="save-button
            ${classMap({
                  saved: this._saving! === false || this._changed === true,
                })}"
                icon="${this._changed ? "hass:circle-medium" : "hass:check"}"
              ></ha-icon
            ></mwc-button>
          </app-toolbar>
        </app-header>
        <div class="content">
          <hui-yaml-editor
            .hass="${this.hass}"
            @yaml-changed="${this._yamlChanged}"
            @yaml-save="${this._handleSave}"
          >
          </hui-yaml-editor>
        </div>
      </app-header-layout>
    `;
  }

  protected firstUpdated() {
    this.yamlEditor.value = yaml.safeDump(this.lovelace!.config);
    this.yamlEditor.codemirror.clearHistory();
    this._generation = this.yamlEditor.codemirror.changeGeneration(true);
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          --code-mirror-height: 100%;
        }

        app-header-layout {
          height: 100vh;
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

        hui-code-editor {
          height: 100%;
        }

        .save-button {
          opacity: 0;
          margin-left: -21px;
          transition: all 1.5s;
        }

        .saved {
          margin-left: initial;
          margin-right: -8px;
          opacity: 1;
        }
      `,
    ];
  }

  private _yamlChanged() {
    if (!this._generation) {
      return;
    }
    this._changed = !this.yamlEditor.codemirror.isClean(this._generation);
    if (this._changed && !window.onbeforeunload) {
      window.onbeforeunload = () => {
        return true;
      };
    } else if (!this._changed && window.onbeforeunload) {
      window.onbeforeunload = null;
    }
  }

  private _closeEditor() {
    if (this._changed) {
      if (
        !confirm("You have unsaved changes, are you sure you want to exit?")
      ) {
        return;
      }
    }
    window.onbeforeunload = null;
    this.closeEditor!();
  }

  private async _handleSave() {
    this._saving = true;

    if (this.yamlEditor.hasComments) {
      if (
        !confirm(
          "Your config contains comment(s), these will not be saved. Do you want to continue?"
        )
      ) {
        return;
      }
    }

    let value;
    try {
      value = yaml.safeLoad(this.yamlEditor.value);
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
    this._generation = this.yamlEditor.codemirror.changeGeneration(true);
    window.onbeforeunload = null;
    this._saving = false;
    this._changed = false;
  }

  private get yamlEditor(): HuiYamlEditor {
    return this.shadowRoot!.querySelector("hui-yaml-editor")!;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-editor": LovelaceFullConfigEditor;
  }
}

customElements.define("hui-editor", LovelaceFullConfigEditor);
