import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
  property,
} from "lit-element";

import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-icon-button/paper-icon-button.js";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import { haStyleDialog } from "../../../../resources/styles";

import "../../components/hui-entity-editor";
import "./hui-view-editor";
import { HomeAssistant } from "../../../../types";
import {
  LovelaceViewConfig,
  LovelaceCardConfig,
} from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";
import { EntitiesEditorEvent, ViewEditEvent } from "../types";
import { processEditorEntities } from "../process-editor-entities";
import { EntityConfig } from "../../entity-rows/types";
import { navigate } from "../../../../common/navigate";
import { Lovelace } from "../../types";
import { deleteView, addView, replaceView } from "../config-util";

@customElement("hui-edit-view")
export class HuiEditView extends LitElement {
  @property() public lovelace?: Lovelace;

  @property() public viewIndex?: number;

  @property() public hass?: HomeAssistant;

  @property() private _config?: LovelaceViewConfig;

  @property() private _badges?: EntityConfig[];

  @property() private _cards?: LovelaceCardConfig[];

  @property() private _saving: boolean;

  @property() private _curTab?: string;

  private _curTabIndex: number;

  public constructor() {
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

  protected render(): TemplateResult | void {
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
      <paper-dialog with-backdrop>
        <h2>
          ${this.hass!.localize("ui.panel.lovelace.editor.edit_view.header")}
        </h2>
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
          ${this.viewIndex !== undefined
            ? html`
                <paper-icon-button
                  class="delete"
                  title="Delete"
                  icon="hass:delete"
                  @click="${this._delete}"
                ></paper-icon-button>
              `
            : ""}
          <mwc-button @click="${this._closeDialog}"
            >${this.hass!.localize("ui.common.cancel")}</mwc-button
          >
          <mwc-button
            ?disabled="${!this._config || this._saving}"
            @click="${this._save}"
          >
            <paper-spinner
              ?active="${this._saving}"
              alt="Saving"
            ></paper-spinner>
            ${this.hass!.localize("ui.common.save")}</mwc-button
          >
        </div>
      </paper-dialog>
    `;
  }

  private async _delete(): Promise<void> {
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

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 660px) {
          paper-dialog {
            width: 650px;
          }
        }
        paper-dialog {
          max-width: 650px;
        }
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        mwc-button paper-spinner {
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
    `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-view": HuiEditView;
  }
}
