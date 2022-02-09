import "@material/mwc-button";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { navigate } from "../../../../common/navigate";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import "../../../../components/ha-alert";
import type {
  LovelaceBadgeConfig,
  LovelaceCardConfig,
  LovelaceViewConfig,
} from "../../../../data/lovelace";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../components/hui-entity-editor";
import { addView, deleteView, replaceView } from "../config-util";
import "../hui-badge-preview";
import { processEditorEntities } from "../process-editor-entities";
import {
  EntitiesEditorEvent,
  ViewEditEvent,
  ViewVisibilityChangeEvent,
} from "../types";
import "./hui-view-editor";
import "./hui-view-visibility-editor";
import { EditViewDialogParams } from "./show-edit-view-dialog";
import {
  DEFAULT_VIEW_LAYOUT,
  PANEL_VIEW_LAYOUT,
  VIEWS_NO_BADGE_SUPPORT,
} from "../../views/const";
import { deepEqual } from "../../../../common/util/deep-equal";

@customElement("hui-dialog-edit-view")
export class HuiDialogEditView extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: EditViewDialogParams;

  @state() private _config?: LovelaceViewConfig;

  @state() private _badges?: LovelaceBadgeConfig[];

  @state() private _cards?: LovelaceCardConfig[];

  @state() private _saving = false;

  @state() private _curTab?: string;

  @state() private _dirty = false;

  private _curTabIndex = 0;

  get _type(): string {
    if (!this._config) {
      return DEFAULT_VIEW_LAYOUT;
    }
    return this._config.panel
      ? PANEL_VIEW_LAYOUT
      : this._config.type || DEFAULT_VIEW_LAYOUT;
  }

  public showDialog(params: EditViewDialogParams): void {
    this._params = params;

    if (this._params.viewIndex === undefined) {
      this._config = {};
      this._badges = [];
      this._cards = [];
      this._dirty = false;
    } else {
      const { cards, badges, ...viewConfig } =
        this._params.lovelace!.config.views[this._params.viewIndex];
      this._config = viewConfig;
      this._badges = badges ? processEditorEntities(badges) : [];
      this._cards = cards;
    }
  }

  public closeDialog(): void {
    this._curTabIndex = 0;
    this._params = undefined;
    this._config = {};
    this._badges = [];
    this._dirty = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
    if (!this._params) {
      return html``;
    }

    let content;
    switch (this._curTab) {
      case "tab-settings":
        content = html`
          <hui-view-editor
            .isNew=${this._params.viewIndex === undefined}
            .hass=${this.hass}
            .config=${this._config}
            @view-config-changed=${this._viewConfigChanged}
          ></hui-view-editor>
        `;
        break;
      case "tab-badges":
        content = html`
          ${this._badges?.length
            ? html`
                ${VIEWS_NO_BADGE_SUPPORT.includes(this._type)
                  ? html`
                      <ha-alert alert-type="warning">
                        ${this.hass!.localize(
                          "ui.panel.lovelace.editor.edit_badges.view_no_badges"
                        )}
                      </ha-alert>
                    `
                  : ""}
                <div class="preview-badges">
                  ${this._badges.map(
                    (badgeConfig) => html`
                      <hui-badge-preview
                        .hass=${this.hass}
                        .config=${badgeConfig}
                      ></hui-badge-preview>
                    `
                  )}
                </div>
              `
            : ""}
          <hui-entity-editor
            .hass=${this.hass}
            .entities=${this._badges}
            @entities-changed=${this._badgesChanged}
          ></hui-entity-editor>
        `;
        break;
      case "tab-visibility":
        content = html`
          <hui-view-visibility-editor
            .hass=${this.hass}
            .config=${this._config}
            @view-visibility-changed=${this._viewVisibilityChanged}
          ></hui-view-visibility-editor>
        `;
        break;
      case "tab-cards":
        content = html` Cards `;
        break;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        .heading=${this._viewConfigTitle}
      >
        <div slot="heading">
          <h2>${this._viewConfigTitle}</h2>
          <paper-tabs
            scrollable
            hide-scroll-buttons
            .selected=${this._curTabIndex}
            @selected-item-changed=${this._handleTabSelected}
          >
            <paper-tab id="tab-settings" dialogInitialFocus
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
        </div>
        ${content}
        ${this._params.viewIndex !== undefined
          ? html`
              <mwc-button
                class="warning"
                slot="secondaryAction"
                @click=${this._deleteConfirm}
              >
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_view.delete"
                )}
              </mwc-button>
            `
          : ""}
        <mwc-button @click=${this.closeDialog} slot="primaryAction"
          >${this.hass!.localize("ui.common.cancel")}</mwc-button
        >
        <mwc-button
          slot="primaryAction"
          ?disabled=${!this._config || this._saving || !this._dirty}
          @click=${this._save}
        >
          ${this._saving
            ? html`<ha-circular-progress
                active
                size="small"
                title="Saving"
              ></ha-circular-progress>`
            : ""}
          ${this.hass!.localize("ui.common.save")}</mwc-button
        >
      </ha-dialog>
    `;
  }

  private async _delete(): Promise<void> {
    if (!this._params) {
      return;
    }
    try {
      await this._params.lovelace!.saveConfig(
        deleteView(this._params.lovelace!.config, this._params.viewIndex!)
      );
      this.closeDialog();
      navigate(`/${window.location.pathname.split("/")[1]}`);
    } catch (err: any) {
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
          this._cards?.length ? "_existing_cards" : ""
        }_text`,
        "name",
        this._config?.title || "Unnamed view",
        "number",
        this._cards?.length || 0
      ),
      confirm: () => this._delete(),
    });
  }

  private _handleTabSelected(ev: CustomEvent): void {
    if (!ev.detail.value) {
      return;
    }
    this._curTab = ev.detail.value.id;
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._config) {
      return;
    }
    if (!this._isConfigChanged()) {
      this.closeDialog();
      return;
    }

    this._saving = true;

    const viewConf: LovelaceViewConfig = {
      ...this._config,
      badges: this._badges,
      cards: this._cards,
    };

    const lovelace = this._params.lovelace!;

    try {
      await lovelace.saveConfig(
        this._creatingView
          ? addView(lovelace.config, viewConf)
          : replaceView(lovelace.config, this._params.viewIndex!, viewConf)
      );
      if (this._params.saveCallback) {
        this._params.saveCallback(
          this._params.viewIndex || lovelace.config.views.length,
          viewConf
        );
      }
      this.closeDialog();
    } catch (err: any) {
      showAlertDialog(this, {
        text: `Saving failed: ${err.message}`,
      });
    } finally {
      this._saving = false;
    }
  }

  private _viewConfigChanged(ev: ViewEditEvent): void {
    if (
      ev.detail &&
      ev.detail.config &&
      !deepEqual(this._config, ev.detail.config)
    ) {
      this._config = ev.detail.config;
      this._dirty = true;
    }
  }

  private _viewVisibilityChanged(
    ev: HASSDomEvent<ViewVisibilityChangeEvent>
  ): void {
    if (ev.detail.visible && this._config) {
      this._config.visible = ev.detail.visible;
    }
    this._dirty = true;
  }

  private _badgesChanged(ev: EntitiesEditorEvent): void {
    if (!this._badges || !this.hass || !ev.detail || !ev.detail.entities) {
      return;
    }
    this._badges = processEditorEntities(ev.detail.entities);
    this._dirty = true;
  }

  private _isConfigChanged(): boolean {
    return (
      this._creatingView ||
      JSON.stringify(this._config) !==
        JSON.stringify(
          this._params!.lovelace!.config.views[this._params!.viewIndex!]
        )
    );
  }

  private get _creatingView(): boolean {
    return this._params!.viewIndex === undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        h2 {
          display: block;
          color: var(--primary-text-color);
          line-height: normal;
          -moz-osx-font-smoothing: grayscale;
          -webkit-font-smoothing: antialiased;
          font-family: Roboto, sans-serif;
          font-family: var(
            --mdc-typography-headline6-font-family,
            var(--mdc-typography-font-family, Roboto, sans-serif)
          );
          font-size: 1.25rem;
          font-size: var(--mdc-typography-headline6-font-size, 1.25rem);
          line-height: 2rem;
          line-height: var(--mdc-typography-headline6-line-height, 2rem);
          font-weight: 500;
          font-weight: var(--mdc-typography-headline6-font-weight, 500);
          letter-spacing: 0.0125em;
          letter-spacing: var(
            --mdc-typography-headline6-letter-spacing,
            0.0125em
          );
          text-decoration: inherit;
          text-decoration: var(
            --mdc-typography-headline6-text-decoration,
            inherit
          );
          text-transform: inherit;
          text-transform: var(
            --mdc-typography-headline6-text-transform,
            inherit
          );
          position: relative;
          flex-shrink: 0;
          box-sizing: border-box;
          margin: 0;
          padding: 20px 24px 9px;
          border-bottom: 1px solid transparent;
        }
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          color: var(--primary-text-color);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 0 20px;
        }
        mwc-button.warning {
          margin-right: auto;
        }
        ha-circular-progress {
          display: none;
        }
        ha-circular-progress[active] {
          display: block;
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
          margin: 12px 16px;
          flex-wrap: wrap;
        }

        @media all and (min-width: 600px) {
          ha-dialog {
            --mdc-dialog-min-width: 600px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-view": HuiDialogEditView;
  }
}
