import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiClose, mdiDotsVertical } from "@mdi/js";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { navigate } from "../../../../common/navigate";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-alert";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
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
import {
  DEFAULT_VIEW_LAYOUT,
  PANEL_VIEW_LAYOUT,
  VIEWS_NO_BADGE_SUPPORT,
} from "../../views/const";
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

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  private _curTabIndex = 0;

  get _type(): string {
    if (!this._config) {
      return DEFAULT_VIEW_LAYOUT;
    }
    return this._config.panel
      ? PANEL_VIEW_LAYOUT
      : this._config.type || DEFAULT_VIEW_LAYOUT;
  }

  protected updated(changedProperties: PropertyValues) {
    if (this._yamlMode && changedProperties.has("_yamlMode")) {
      const viewConfig = {
        ...this._config,
        badges: this._badges,
      };
      this._editor?.setValue(viewConfig);
    }
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
    this._yamlMode = false;
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

  protected render() {
    if (!this._params) {
      return nothing;
    }

    let content;

    if (this._yamlMode) {
      content = html`
        <ha-yaml-editor
          .hass=${this.hass}
          dialogInitialFocus
          @value-changed=${this._viewYamlChanged}
        ></ha-yaml-editor>
      `;
    } else {
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
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        .heading=${this._viewConfigTitle}
        class=${classMap({
          "yaml-mode": this._yamlMode,
        })}
      >
        <ha-dialog-header show-border slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass!.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <h2 slot="title">${this._viewConfigTitle}</h2>
          <ha-button-menu
            slot="actionItems"
            fixed
            corner="BOTTOM_END"
            menuCorner="END"
            @action=${this._handleAction}
            @closed=${stopPropagation}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass!.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <mwc-list-item graphic="icon">
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_view.edit_ui"
              )}
              ${!this._yamlMode
                ? html`<ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>`
                : ``}
            </mwc-list-item>

            <mwc-list-item graphic="icon">
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_view.edit_yaml"
              )}
              ${this._yamlMode
                ? html`<ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>`
                : ``}
            </mwc-list-item>
          </ha-button-menu>
          ${!this._yamlMode
            ? html`<paper-tabs
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
              </paper-tabs>`
            : ""}
        </ha-dialog-header>
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

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    ev.stopPropagation();
    ev.preventDefault();
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = false;
        break;
      case 1:
        this._yamlMode = true;
        break;
    }
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
          ? addView(this.hass!, lovelace.config, viewConf)
          : replaceView(
              this.hass!,
              lovelace.config,
              this._params.viewIndex!,
              viewConf
            )
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
        text: `${this.hass!.localize(
          "ui.panel.lovelace.editor.edit_view.saving_failed"
        )}: ${err.message}`,
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

  private _viewYamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    const { badges = [], ...config } = ev.detail.value;
    this._config = config;
    this._badges = badges;
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
        ha-dialog {
          /* Set the top top of the dialog to a fixed position, so it doesnt jump when the content changes size */
          --vertical-align-dialog: flex-start;
          --dialog-surface-margin-top: 40px;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* When in fullscreen dialog should be attached to top */
          ha-dialog {
            --dialog-surface-margin-top: 0px;
          }
        }
        ha-dialog.yaml-mode {
          --dialog-content-padding: 0;
        }
        h2 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        paper-tabs {
          --paper-tabs-selection-bar-color: var(--primary-color);
          color: var(--primary-text-color);
          text-transform: uppercase;
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
        .selected_menu_item {
          color: var(--primary-color);
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
