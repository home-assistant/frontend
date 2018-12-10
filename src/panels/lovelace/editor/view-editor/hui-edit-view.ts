import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-icon-button/paper-icon-button.js";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "../../components/hui-entity-editor";
import "./hui-view-editor";
import { HomeAssistant } from "../../../../types";
import {
  LovelaceViewConfig,
  LovelaceCardConfig,
} from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";
import { hassLocalizeLitMixin } from "../../../../mixins/lit-localize-mixin";
import { EntitiesEditorEvent, ViewEditEvent } from "../types";
import { processEditorEntities } from "../process-editor-entities";
import { EntityConfig } from "../../entity-rows/types";
import { navigate } from "../../../../common/navigate";
import { Lovelace } from "../../types";
import { deleteView, addView, replaceView } from "../config-util";

export class HuiEditView extends hassLocalizeLitMixin(LitElement) {
  public lovelace?: Lovelace;
  public viewIndex?: number;
  protected hass?: HomeAssistant;
  private _config?: LovelaceViewConfig;
  private _badges?: EntityConfig[];
  private _cards?: LovelaceCardConfig[];
  private _saving: boolean;
  private _curTabIndex: number;
  private _curTab?: string;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      lovelace: {},
      viewIndex: {},
      _config: {},
      _badges: {},
      _cards: {},
      _saving: {},
      _curTab: {},
    };
  }

  protected constructor() {
    super();
    this._saving = false;
    this._curTabIndex = 0;
  }

  public async showDialog(): Promise<void> {
    // Wait till dialog is rendered.
    if (this._dialog == null) {
      await this.updateComplete;
    }

    if (this.viewIndex === undefined) {
      this._config = {};
      this._badges = [];
      this._cards = [];
    } else {
      const { cards, badges, ...viewConfig } = this.lovelace!.config.views[
        this.viewIndex
      ];
      this._config = viewConfig;
      this._badges = badges ? processEditorEntities(badges) : [];
      this._cards = cards;
    }

    this._dialog.open();
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  protected render(): TemplateResult {
    let content;
    switch (this._curTab) {
      case "tab-settings":
        content = html`
          <hui-view-editor
            .hass="${this.hass}"
            .config="${this._config}"
            @view-config-changed="${this._viewConfigChanged}"
          ></hui-view-editor>
        `;
        break;
      case "tab-badges":
        content = html`
          <hui-entity-editor
            .hass="${this.hass}"
            .entities="${this._badges}"
            @entities-changed="${this._badgesChanged}"
          ></hui-entity-editor>
        `;
        break;
      case "tab-cards":
        content = html`
          Cards
        `;
        break;
    }
    return html`
      ${this.renderStyle()}
      <paper-dialog with-backdrop>
        <h2>${this.localize("ui.panel.lovelace.editor.edit_view.header")}</h2>
        <paper-tabs
          scrollable
          hide-scroll-buttons
          .selected="${this._curTabIndex}"
          @selected-item-changed="${this._handleTabSelected}"
        >
          <paper-tab id="tab-settings">Settings</paper-tab>
          <paper-tab id="tab-badges">Badges</paper-tab>
        </paper-tabs>
        <paper-dialog-scrollable> ${content} </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${
            this.viewIndex !== undefined
              ? html`
                  <paper-icon-button
                    class="delete"
                    title="Delete"
                    icon="hass:delete"
                    @click="${this._delete}"
                  ></paper-icon-button>
                `
              : ""
          }
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
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        paper-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-icon-button.delete {
          margin-right: auto;
          color: var(--secondary-text-color);
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

  private async _delete() {
    if (this._cards && this._cards.length > 0) {
      alert(
        "You can't delete a view that has cards in it. Remove the cards first."
      );
      return;
    }

    if (!confirm("Are you sure you want to delete this view?")) {
      return;
    }

    try {
      await this.lovelace!.saveConfig(
        deleteView(this.lovelace!.config, this.viewIndex!)
      );
      this._closeDialog();
      navigate(this, `/lovelace/0`);
    } catch (err) {
      alert(`Deleting failed: ${err.message}`);
    }
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog, "iron-resize");
  }

  private _closeDialog(): void {
    this._curTabIndex = 0;
    this.lovelace = undefined;
    this._config = {};
    this._badges = [];
    this._dialog.close();
  }

  private _handleTabSelected(ev: CustomEvent): void {
    if (!ev.detail.value) {
      return;
    }
    this._curTab = ev.detail.value.id;
    this._resizeDialog();
  }

  private async _save(): Promise<void> {
    if (!this._config) {
      return;
    }
    if (!this._isConfigChanged()) {
      this._closeDialog();
      return;
    }

    this._saving = true;

    const viewConf: LovelaceViewConfig = {
      cards: this._cards,
      badges: this._badges!.map((entityConf) => entityConf.entity),
      ...this._config,
    };

    const lovelace = this.lovelace!;

    try {
      await lovelace.saveConfig(
        this._creatingView
          ? addView(lovelace.config, viewConf)
          : replaceView(lovelace.config, this.viewIndex!, viewConf)
      );
      this._closeDialog();
    } catch (err) {
      alert(`Saving failed: ${err.message}`);
    } finally {
      this._saving = false;
    }
  }

  private _viewConfigChanged(ev: ViewEditEvent): void {
    if (ev.detail && ev.detail.config) {
      this._config = ev.detail.config;
    }
  }

  private _badgesChanged(ev: EntitiesEditorEvent): void {
    if (!this._badges || !this.hass || !ev.detail || !ev.detail.entities) {
      return;
    }
    this._badges = ev.detail.entities;
  }

  private _isConfigChanged(): boolean {
    return (
      this._creatingView ||
      JSON.stringify(this._config) !==
        JSON.stringify(this.lovelace!.config.views[this.viewIndex!])
    );
  }

  private get _creatingView(): boolean {
    return this.viewIndex === undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-view": HuiEditView;
  }
}

customElements.define("hui-edit-view", HuiEditView);
