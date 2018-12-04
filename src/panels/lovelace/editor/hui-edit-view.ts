import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "../components/hui-theme-select-editor";
import { HomeAssistant } from "../../../types";
import {
  addView,
  updateViewConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace";
import { fireEvent } from "../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { EditorTarget } from "./types";

export class HuiEditView extends hassLocalizeLitMixin(LitElement) {
  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      viewConfig: {},
      add: {},
      _config: {},
      _saving: {},
    };
  }

  public viewConfig?: LovelaceViewConfig;
  public add?: boolean;
  public reloadLovelace?: () => {};
  protected hass?: HomeAssistant;
  private _config?: LovelaceViewConfig;
  private _saving: boolean;

  protected constructor() {
    super();
    this._saving = false;
  }

  public async showDialog(): Promise<void> {
    // Wait till dialog is rendered.
    if (this._dialog == null) {
      await this.updateComplete;
    }
    this._dialog.open();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!changedProperties.has("viewConfig") && !changedProperties.has("add")) {
      return;
    }
    if (
      this.viewConfig &&
      (!changedProperties.get("viewConfig") ||
        this.viewConfig.id !==
          (changedProperties.get("viewConfig") as LovelaceViewConfig).id)
    ) {
      this._config = this.viewConfig;
    } else if (changedProperties.has("add")) {
      this._config = { cards: [] };
    }
    this._resizeDialog();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  get _id(): string {
    if (!this._config) {
      return "";
    }
    return this._config.id || "";
  }

  get _title(): string {
    if (!this._config) {
      return "";
    }
    return this._config.title || "";
  }

  get _icon(): string {
    if (!this._config) {
      return "";
    }
    return this._config.icon || "";
  }

  get _theme(): string {
    if (!this._config) {
      return "";
    }
    return this._config.theme || "Backend-selected";
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <paper-dialog with-backdrop>
        <h2>${this.localize("ui.panel.lovelace.editor.edit_view.header")}</h2>
        <paper-dialog-scrollable>
          <div class="card-config">
            <paper-input
              label="ID"
              value="${this._id}"
              .configValue="${"id"}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
            <paper-input
              label="Title"
              value="${this._title}"
              .configValue="${"title"}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
            <paper-input
              label="Icon"
              value="${this._icon}"
              .configValue="${"icon"}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
            <hui-theme-select-editor
              .hass="${this.hass}"
              .value="${this._theme}"
              .configValue="${"theme"}"
              @theme-changed="${this._valueChanged}"
            ></hui-theme-select-editor>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button @click="${this._closeDialog}"
            >${this.localize("ui.common.cancel")}</paper-button
          >
          <paper-button
            ?disabled="${!this._config || this._saving}"
            @click="${this._save}"
          >
            <paper-spinner
              ?active="${this._saving}"
              alt="Saving"
            ></paper-spinner>
            ${this.localize("ui.common.save")}</paper-button
          >
        </div>
      </paper-dialog>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        paper-dialog {
          width: 650px;
        }
        paper-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
        .hidden {
          display: none;
        }
        .error {
          color: #ef5350;
          border-bottom: 1px solid #ef5350;
        }
      </style>
    `;
  }

  private _save(): void {
    this._saving = true;
    this._updateConfigInBackend();
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog, "iron-resize");
  }

  private _closeDialog(): void {
    this._config = { cards: [] };
    this.viewConfig = undefined;
    this._dialog.close();
  }

  private async _updateConfigInBackend(): Promise<void> {
    if (!this._isConfigChanged()) {
      this._closeDialog();
      this._saving = false;
      return;
    }

    try {
      if (this.add) {
        await addView(this.hass!, this._config!, "json");
      } else {
        await updateViewConfig(
          this.hass!,
          this.viewConfig!.id!,
          this._config!,
          "json"
        );
      }
      this.reloadLovelace!();
      this._closeDialog();
      this._saving = false;
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
      this._saving = false;
    }
  }

  private _valueChanged(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    if (target.configValue) {
      this._config = {
        ...this._config,
        [target.configValue]: target.value,
      };
    }
  }

  private _isConfigChanged(): boolean {
    if (!this.add) {
      return true;
    }
    return JSON.stringify(this._config) !== JSON.stringify(this.viewConfig);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-view": HuiEditView;
  }
}

customElements.define("hui-edit-view", HuiEditView);
