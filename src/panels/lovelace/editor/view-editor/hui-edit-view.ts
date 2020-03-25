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
import "@polymer/paper-icon-button/paper-icon-button.js";
import "../../../../components/dialog/ha-paper-dialog";
// tslint:disable-next-line:no-duplicate-imports
import { HaPaperDialog } from "../../../../components/dialog/ha-paper-dialog";
import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";

import { haStyleDialog } from "../../../../resources/styles";

import "../../components/hui-entity-editor";
import "./hui-view-editor";
import "./hui-view-visibility-editor";
import "../hui-badge-preview";
import { HomeAssistant } from "../../../../types";
import {
  LovelaceViewConfig,
  LovelaceCardConfig,
  LovelaceBadgeConfig,
} from "../../../../data/lovelace";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import {
  EntitiesEditorEvent,
  ViewEditEvent,
  ViewVisibilityChangeEvent,
} from "../types";
import { processEditorEntities } from "../process-editor-entities";
import { navigate } from "../../../../common/navigate";
import { Lovelace } from "../../types";
import { deleteView, addView, replaceView } from "../config-util";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";

@customElement("hui-edit-view")
export class HuiEditView extends LitElement {
  @property() public lovelace?: Lovelace;

  @property() public viewIndex?: number;

  @property() public hass?: HomeAssistant;

  @property() private _config?: LovelaceViewConfig;

  @property() private _badges?: LovelaceBadgeConfig[];

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

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private get _viewConfigTitle(): string {
    if (!this._config || !this._config.title) {
      return this.hass!.localize("ui.panel.lovelace.editor.edit_view.header");
    }

    return this.hass!.localize(
      "ui.panel.lovelace.editor.edit_view.header_name",
      "name",
      this._config.title
    );
  }

  protected render(): TemplateResult {
    let content;
    switch (this._curTab) {
      case "tab-settings":
        content = html`
          <hui-view-editor
            .isNew=${this.viewIndex === undefined}
            .hass=${this.hass}
            .config="${this._config}"
            @view-config-changed="${this._viewConfigChanged}"
          ></hui-view-editor>
        `;
        break;
      case "tab-badges":
        content = html`
          ${this._badges?.length
            ? html`
                <div class="preview-badges">
                  ${this._badges.map((badgeConfig) => {
                    return html`
                    <hui-badge-preview
                      .hass=${this.hass}
                      .config=${badgeConfig}
                    ></hui-card-preview>
                  `;
                  })}
                </div>
              `
            : ""}
          <hui-entity-editor
            .hass=${this.hass}
            .entities="${this._badges}"
            @entities-changed="${this._badgesChanged}"
          ></hui-entity-editor>
        `;
        break;
      case "tab-visibility":
        content = html`
          <hui-view-visibility-editor
            .hass="${this.hass}"
            .config="${this._config}"
            @view-visibility-changed="${this._viewVisibilityChanged}"
          ></hui-view-visibility-editor>
        `;
        break;
      case "tab-cards":
        content = html`
          Cards
        `;
        break;
    }
    return html`
      <ha-paper-dialog with-backdrop modal>
        <h2>
          ${this._viewConfigTitle}
        </h2>
        <paper-tabs
          scrollable
          hide-scroll-buttons
          .selected="${this._curTabIndex}"
          @selected-item-changed="${this._handleTabSelected}"
        >
          <paper-tab id="tab-settings"
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.edit_view.tab_settings"
            )}</paper-tab
          >
          <paper-tab id="tab-badges"
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.edit_view.tab_badges"
            )}</paper-tab
          >
          <paper-tab id="tab-visibility"
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.edit_view.tab_visibility"
            )}</paper-tab
          >
        </paper-tabs>
        <paper-dialog-scrollable> ${content} </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          ${this.viewIndex !== undefined
            ? html`
                <mwc-button class="warning" @click="${this._deleteConfirm}">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_view.delete"
                  )}
                </mwc-button>
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
      </ha-paper-dialog>
    `;
  }

  private async _delete(): Promise<void> {
    try {
      await this.lovelace!.saveConfig(
        deleteView(this.lovelace!.config, this.viewIndex!)
      );
      this._closeDialog();
      navigate(this, `/${window.location.pathname.split("/")[1]}`);
    } catch (err) {
      showAlertDialog(this, {
        text: `Deleting failed: ${err.message}`,
      });
    }
  }

  private _deleteConfirm(): void {
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        `ui.panel.lovelace.views.confirm_delete${
          this._cards?.length ? `_existing_cards` : ""
        }`
      ),
      text: this.hass!.localize(
        `ui.panel.lovelace.views.confirm_delete${
          this._cards?.length ? `_existing_cards` : ""
        }_text`,
        "name",
        this._config?.title || "Unnamed view",
        "number",
        this._cards?.length || 0
      ),
      confirm: () => this._delete(),
    });
  }

  private async _resizeDialog(): Promise<void> {
    await this.updateComplete;
    fireEvent(this._dialog as HTMLElement, "iron-resize");
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
      ...this._config,
      badges: this._badges,
      cards: this._cards,
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
      showAlertDialog(this, {
        text: `Saving failed: ${err.message}`,
      });
    } finally {
      this._saving = false;
    }
  }

  private _viewConfigChanged(ev: ViewEditEvent): void {
    if (ev.detail && ev.detail.config) {
      this._config = ev.detail.config;
    }
  }

  private _viewVisibilityChanged(
    ev: HASSDomEvent<ViewVisibilityChangeEvent>
  ): void {
    if (ev.detail.visible && this._config) {
      this._config.visible = ev.detail.visible;
    }
  }

  private _badgesChanged(ev: EntitiesEditorEvent): void {
    if (!this._badges || !this.hass || !ev.detail || !ev.detail.entities) {
      return;
    }
    this._badges = processEditorEntities(ev.detail.entities);
    this._resizeDialog();
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
          ha-paper-dialog {
            max-height: 100%;
            height: 100%;
          }
        }
        @media all and (min-width: 660px) {
          ha-paper-dialog {
            width: 650px;
          }
        }
        ha-paper-dialog {
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
        mwc-button.warning {
          margin-right: auto;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
        paper-dialog-scrollable {
          margin-top: 0;
        }
        .hidden {
          display: none;
        }
        .error {
          color: var(--error-color);
          border-bottom: 1px solid var(--error-color);
        }
        .preview-badges {
          display: flex;
          justify-content: center;
          margin: 8px 16px;
          flex-wrap: wrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-edit-view": HuiEditView;
  }
}
