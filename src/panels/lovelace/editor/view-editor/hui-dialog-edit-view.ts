import type { ActionDetail } from "@material/mwc-list";
import {
  mdiClose,
  mdiDotsVertical,
  mdiFileMoveOutline,
  mdiPlaylistEdit,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { navigate } from "../../../../common/navigate";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-list-item";
import "../../../../components/ha-spinner";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import {
  fetchConfig,
  isStrategyDashboard,
  saveConfig,
  type LovelaceConfig,
} from "../../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../../data/lovelace/config/view";
import { isStrategyView } from "../../../../data/lovelace/config/view";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../components/hui-entity-editor";
import type { Lovelace } from "../../types";
import { SECTIONS_VIEW_LAYOUT } from "../../views/const";
import { generateDefaultSection } from "../../views/default-section";
import { getViewType } from "../../views/get-view-type";
import {
  addView,
  deleteView,
  moveViewToDashboard,
  replaceView,
} from "../config-util";
import { showSelectDashboardDialog } from "../select-dashboard/show-select-dashboard-dialog";
import type { ViewEditEvent, ViewVisibilityChangeEvent } from "../types";
import "./hui-view-background-editor";
import "./hui-view-editor";
import "./hui-view-visibility-editor";
import type { EditViewDialogParams } from "./show-edit-view-dialog";
import "../../../../components/sl-tab-group";

const TABS = ["tab-settings", "tab-background", "tab-visibility"] as const;

@customElement("hui-dialog-edit-view")
export class HuiDialogEditView extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: EditViewDialogParams;

  @state() private _lovelace?: Lovelace;

  @state() private _config?: LovelaceViewConfig;

  @state() private _saving = false;

  @state() private _currTab: (typeof TABS)[number] = TABS[0];

  @state() private _dirty = false;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  @state() private _currentType = getViewType();

  get _type(): string {
    return getViewType(this._config);
  }

  protected updated(changedProperties: PropertyValues) {
    if (this._yamlMode && changedProperties.has("_yamlMode")) {
      const viewConfig = {
        ...this._config,
      };
      this._editor?.setValue(viewConfig);
    }
  }

  public showDialog(params: EditViewDialogParams): void {
    this._params = params;

    if (this._params.viewIndex === undefined) {
      this._config = {
        type: SECTIONS_VIEW_LAYOUT,
      };
      this._dirty = false;
      return;
    }

    this._lovelace = this._params.lovelace;

    const view = this._lovelace.config.views[this._params.viewIndex];
    // Todo : add better support for strategy views
    if (isStrategyView(view)) {
      const { strategy, ...viewConfig } = view;
      this._config = viewConfig;
      return;
    }
    this._config = view;
    this._currentType = this._type;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._config = {};
    this._yamlMode = false;
    this._dirty = false;
    this._currTab = TABS[0];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private get _viewConfigTitle(): string {
    if (!this._config || !this._config.title) {
      return this.hass!.localize("ui.panel.lovelace.editor.edit_view.header");
    }

    return this.hass!.localize(
      "ui.panel.lovelace.editor.edit_view.header_name",
      { name: this._config.title }
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
      switch (this._currTab) {
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
        case "tab-background":
          content = html`
            <hui-view-background-editor
              .hass=${this.hass}
              .config=${this._config}
              @view-config-changed=${this._viewConfigChanged}
            ></hui-view-background-editor>
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
      }
    }

    const convertToSection =
      this._type === SECTIONS_VIEW_LAYOUT &&
      this._currentType !== SECTIONS_VIEW_LAYOUT &&
      this._config?.cards?.length;
    const convertNotSupported =
      this._type !== SECTIONS_VIEW_LAYOUT &&
      this._currentType === SECTIONS_VIEW_LAYOUT &&
      this._config?.sections?.length;

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
            menu-corner="END"
            @action=${this._handleAction}
            @closed=${stopPropagation}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass!.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item graphic="icon">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.edit_view.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>
            <ha-list-item graphic="icon">
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_view.move_to_dashboard"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiFileMoveOutline}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
          ${convertToSection
            ? html`
                <ha-alert alert-type="info">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_view.card_to_section_convert"
                  )}
                  <ha-button
                    slot="action"
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_view.convert_view"
                    )}
                    @click=${this._convertToSection}
                  >
                  </ha-button>
                </ha-alert>
              `
            : nothing}
          ${convertNotSupported
            ? html`
                <ha-alert alert-type="warning">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_view.section_to_card_not_supported"
                  )}
                </ha-alert>
              `
            : nothing}
          ${!this._yamlMode
            ? html`<sl-tab-group @sl-tab-show=${this._handleTabChanged}>
                ${TABS.map(
                  (tab) => html`
                    <sl-tab
                      slot="nav"
                      .panel=${tab}
                      .active=${this._currTab === tab}
                    >
                      ${this.hass!.localize(
                        `ui.panel.lovelace.editor.edit_view.${tab.replace("-", "_")}`
                      )}
                    </sl-tab>
                  `
                )}
              </sl-tab-group>`
            : nothing}
        </ha-dialog-header>
        ${content}
        ${this._params.viewIndex !== undefined
          ? html`
              <ha-button
                variant="danger"
                appearance="plain"
                slot="secondaryAction"
                @click=${this._deleteConfirm}
              >
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_view.delete"
                )}
              </ha-button>
            `
          : nothing}
        <ha-button
          class="save"
          slot="primaryAction"
          ?disabled=${!this._config ||
          this._saving ||
          !this._dirty ||
          convertToSection ||
          convertNotSupported}
          @click=${this._save}
        >
          ${this._saving
            ? html`<ha-spinner size="small" aria-label="Saving"></ha-spinner>`
            : nothing}
          ${this.hass!.localize("ui.common.save")}</ha-button
        >
      </ha-dialog>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    ev.stopPropagation();
    ev.preventDefault();
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = !this._yamlMode;
        break;
      case 1:
        this._openSelectDashboard();
        break;
    }
  }

  private _openSelectDashboard(): void {
    showSelectDashboardDialog(this, {
      lovelaceConfig: this._lovelace!.config,
      dashboardSelectedCallback: this._moveViewToDashboard,
      urlPath: this._lovelace!.urlPath,
    });
  }

  private _moveViewToDashboard = async (urlPath: string | null) => {
    let errorMessage;
    let toConfig;
    let undoAction;

    try {
      toConfig = (await fetchConfig(
        this.hass!.connection,
        urlPath,
        false
      )) as LovelaceConfig;
    } catch (err: any) {
      errorMessage = this.hass!.localize(
        "ui.panel.lovelace.editor.select_dashboard.get_config_failed"
      );
      // eslint-disable-next-line no-console
      console.error(err);
    }

    if (toConfig && isStrategyDashboard(toConfig)) {
      errorMessage = this.hass!.localize(
        "ui.panel.lovelace.editor.select_dashboard.cannot_move_to_strategy"
      );
    }

    if (!errorMessage) {
      const [newFromConfig, newToConfig] = moveViewToDashboard(
        this.hass!,
        this._lovelace!.config,
        toConfig,
        this._params!.viewIndex!
      );

      const oldFromConfig = this._lovelace!.config;
      const oldToConfig = toConfig;

      undoAction = async () => {
        await saveConfig(this.hass!, urlPath, oldToConfig);
        await this._lovelace!.saveConfig(oldFromConfig);
      };

      try {
        await this._lovelace!.saveConfig(newFromConfig);
        await saveConfig(this.hass!, urlPath, newToConfig);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        try {
          await undoAction();
          errorMessage = this.hass!.localize(
            "ui.panel.lovelace.editor.select_dashboard.move_failed"
          );
        } catch (revertError) {
          // eslint-disable-next-line no-console
          console.error(revertError);
          errorMessage = this.hass!.localize(
            "ui.panel.lovelace.editor.select_dashboard.revert_failed"
          );
        }
      }
    }

    if (errorMessage) {
      showAlertDialog(this, {
        text: errorMessage,
      });
    } else {
      this._lovelace!.showToast({
        message: this.hass!.localize(
          "ui.panel.lovelace.editor.select_dashboard.success"
        ),
        duration: 4000,
        action: {
          action: undoAction,
          text: this.hass!.localize("ui.common.undo"),
        },
      });
      this.closeDialog();
      navigate(`/${window.location.pathname.split("/")[1]}`);
    }
  };

  private async _convertToSection() {
    if (!this._params || !this._config) {
      return;
    }
    const confirm = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_view.convert_view_title"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_view.convert_view_text"
      ),
      confirmText: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_view.convert_view_action"
      ),
      dismissText: this.hass!.localize("ui.common.cancel"),
    });

    if (!confirm) {
      return;
    }

    const newConfig = {
      ...this._config,
    };
    newConfig.type = SECTIONS_VIEW_LAYOUT;
    newConfig.sections = [generateDefaultSection(this.hass!.localize)];
    newConfig.path = undefined;
    const lovelace = this._params!.lovelace!;

    try {
      await lovelace.saveConfig(
        addView(this.hass!, lovelace.config, newConfig)
      );
      if (this._params.saveCallback) {
        this._params.saveCallback(lovelace.config.views.length, newConfig);
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

  private async _deleteConfirm() {
    const type = this._config?.sections?.length
      ? "sections"
      : this._config?.cards?.length
        ? "cards"
        : "only";

    const named = this._config?.title ? "named" : "unnamed";

    const confirm = await showConfirmationDialog(this, {
      title: this.hass!.localize("ui.panel.lovelace.views.delete_title"),
      text: this.hass!.localize(
        `ui.panel.lovelace.views.delete_${named}_view_${type}`,
        { name: this._config?.title }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirm) return;

    this._delete();
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
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

    const viewConf = {
      ...this._config,
    };
    // Ensure we have at least one section if we are in sections view
    if (viewConf.type === SECTIONS_VIEW_LAYOUT && !viewConf.sections?.length) {
      viewConf.sections = [generateDefaultSection(this.hass!.localize)];
    } else if (!viewConf.cards?.length) {
      viewConf.cards = [];
    }

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
      if (this._params.saveCallback && this._creatingView) {
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
      this._config = {
        ...this._config,
        visible: ev.detail.visible,
      };
    }
    this._dirty = true;
  }

  private _viewYamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._config = ev.detail.value;
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
        sl-tab {
          flex: 1;
        }
        sl-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
        ha-button[slot="secondaryAction"] {
          margin-right: auto;
          margin-inline-end: auto;
          margin-inline-start: initial;
        }
        .hidden {
          display: none;
        }
        .error {
          color: var(--error-color);
          border-bottom: 1px solid var(--error-color);
        }
        ha-alert {
          display: block;
        }
        ha-alert ha-button {
          display: block;
        }
        ha-button.save {
          position: relative;
        }
        .save ha-spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
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
