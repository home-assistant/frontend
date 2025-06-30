import "@material/mwc-button";

import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import {
  mdiCodeBraces,
  mdiCommentProcessingOutline,
  mdiDotsVertical,
  mdiFileMultiple,
  mdiFormatListBulletedTriangle,
  mdiHelpCircle,
  mdiMagnify,
  mdiPencil,
  mdiPlus,
  mdiRefresh,
  mdiShape,
  mdiViewDashboard,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-button-menu";
import "../../components/ha-icon";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-arrow-next";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-svg-icon";
import "../../components/ha-tooltip";
import type { LovelacePanelConfig } from "../../data/lovelace";
import { isStrategyDashboard } from "../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../data/lovelace/config/view";
import {
  deleteDashboard,
  fetchDashboards,
  updateDashboard,
} from "../../data/lovelace/dashboard";
import { getPanelTitle } from "../../data/panel";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import {
  QuickBarMode,
  showQuickBar,
} from "../../dialogs/quick-bar/show-dialog-quick-bar";
import { showShortcutsDialog } from "../../dialogs/shortcuts/show-shortcuts-dialog";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, PanelInfo } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { showDashboardDetailDialog } from "../config/lovelace/dashboards/show-dialog-lovelace-dashboard-detail";
import { showDashboardStrategyEditorDialog } from "./editor/dashboard-strategy-editor/dialogs/show-dialog-dashboard-strategy-editor";
import { showSaveDialog } from "./editor/show-save-config-dialog";
import { getLovelaceStrategy } from "./strategies/get-strategy";
import { isLegacyStrategyConfig } from "./strategies/legacy-strategy";
import type { Lovelace } from "./types";
import "./navigation/hui-lovelace-navigation";

/**
 * Componente de cabecera para Lovelace que maneja toda la lógica del header
 */
@customElement("hui-header")
export class HuiHeader extends LitElement {
  @property({ attribute: false }) public panel?: PanelInfo<LovelacePanelConfig>;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route?: {
    path: string;
    prefix: string;
  };

  @property({ attribute: "cur-view" }) public curView?:
    | number
    | "hass-unused-entities";

  private _conversation = memoizeOne((_components) =>
    isComponentLoaded(this.hass, "conversation")
  );

  private _renderActionItems(): TemplateResult {
    const result: TemplateResult[] = [];
    if (this._editMode) {
      result.push(
        html`<mwc-button
            outlined
            class="exit-edit-mode"
            .label=${this.hass!.localize(
              "ui.panel.lovelace.menu.exit_edit_mode"
            )}
            @click=${this._editModeDisable}
          ></mwc-button>
          <a
            href=${documentationUrl(this.hass, "/dashboards/")}
            rel="noreferrer"
            class="menu-link"
            target="_blank"
          >
            <ha-icon-button
              .label=${this.hass!.localize("ui.panel.lovelace.menu.help")}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>`
      );
    }

    const items: {
      icon: string;
      key: LocalizeKeys;
      overflowAction?: any;
      buttonAction?: any;
      visible: boolean | undefined;
      overflow: boolean;
      overflow_can_promote?: boolean;
      suffix?: string;
    }[] = [
      {
        icon: mdiFormatListBulletedTriangle,
        key: "ui.panel.lovelace.unused_entities.title",
        overflowAction: this._handleUnusedEntities,
        visible: this._editMode && !__DEMO__,
        overflow: true,
      },
      {
        icon: mdiCodeBraces,
        key: "ui.panel.lovelace.editor.menu.raw_editor",
        overflowAction: this._handleRawEditor,
        visible: this._editMode,
        overflow: true,
      },
      {
        icon: mdiViewDashboard,
        key: "ui.panel.lovelace.editor.menu.manage_dashboards",
        overflowAction: this._handleManageDashboards,
        visible: this._editMode && !__DEMO__,
        overflow: true,
      },
      {
        icon: mdiFileMultiple,
        key: "ui.panel.lovelace.editor.menu.manage_resources",
        overflowAction: this._handleManageResources,
        visible: this._editMode && this.hass.userData?.showAdvanced,
        overflow: true,
      },
      {
        icon: mdiMagnify,
        key: "ui.panel.lovelace.menu.search_entities",
        buttonAction: this._showQuickBar,
        overflowAction: this._handleShowQuickBar,
        visible: !this._editMode,
        overflow: this.narrow,
        suffix: this.hass.enableShortcuts ? "(E)" : undefined,
      },
      {
        icon: mdiCommentProcessingOutline,
        key: "ui.panel.lovelace.menu.assist_tooltip",
        buttonAction: this._showVoiceCommandDialog,
        overflowAction: this._handleShowVoiceCommandDialog,
        visible:
          !this._editMode && this._conversation(this.hass.config.components),
        overflow: this.narrow,
        suffix: this.hass.enableShortcuts ? "(A)" : undefined,
      },
      {
        icon: mdiRefresh,
        key: "ui.common.refresh",
        overflowAction: this._handleRefresh,
        visible: !this._editMode && this._yamlMode,
        overflow: true,
      },
      {
        icon: mdiShape,
        key: "ui.panel.lovelace.unused_entities.title",
        overflowAction: this._handleUnusedEntities,
        visible: !this._editMode && this._yamlMode,
        overflow: true,
      },
      {
        icon: mdiRefresh,
        key: "ui.panel.lovelace.menu.reload_resources",
        overflowAction: this._handleReloadResources,
        visible:
          !this._editMode &&
          (this.hass.panels.lovelace?.config as LovelacePanelConfig)?.mode ===
            "yaml",
        overflow: true,
      },
      {
        icon: mdiPencil,
        key: "ui.panel.lovelace.menu.configure_ui",
        overflowAction: this._handleEnableEditMode,
        buttonAction: this._enableEditMode,
        visible:
          !this._editMode &&
          this.hass!.user?.is_admin &&
          !this.hass!.config.recovery_mode,
        overflow: true,
        overflow_can_promote: true,
      },
    ];

    const overflowItems = items.filter((i) => i.visible && i.overflow);
    const overflowCanPromote =
      overflowItems.length === 1 && overflowItems[0].overflow_can_promote;
    const buttonItems = items.filter(
      (i) => i.visible && (!i.overflow || overflowCanPromote)
    );

    buttonItems.forEach((i) => {
      result.push(
        html`<ha-tooltip
          slot="actionItems"
          placement="bottom"
          .content=${[this.hass!.localize(i.key), i.suffix].join(" ")}
        >
          <ha-icon-button
            .path=${i.icon}
            @click=${i.buttonAction}
          ></ha-icon-button>
        </ha-tooltip>`
      );
    });
    if (overflowItems.length && !overflowCanPromote) {
      const listItems: TemplateResult[] = [];
      overflowItems.forEach((i) => {
        listItems.push(
          html`<ha-list-item
            graphic="icon"
            @request-selected=${i.overflowAction}
          >
            ${[this.hass!.localize(i.key), i.suffix].join(" ")}
            <ha-svg-icon slot="graphic" .path=${i.icon}></ha-svg-icon>
          </ha-list-item>`
        );
      });
      result.push(
        html`<ha-button-menu slot="actionItems">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass!.localize("ui.panel.lovelace.editor.menu.open")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${listItems}
        </ha-button-menu>`
      );
    }
    return html`${result}`;
  }

  protected render(): TemplateResult {
    const views = this.lovelace?.config.views ?? [];
    const curViewConfig =
      typeof this.curView === "number" ? views[this.curView] : undefined;
    const dashboardTitle = this.panel
      ? getPanelTitle(this.hass, this.panel)
      : undefined;

    const _isTabHiddenForUser = (view: LovelaceViewConfig) =>
      view.visible !== undefined &&
      ((Array.isArray(view.visible) &&
        !view.visible.some((e) => e.user === this.hass!.user?.id)) ||
        view.visible === false);

    const visibleViews = views.filter(
      (view) => !view.subview && !_isTabHiddenForUser(view)
    );

    return html`
      <div
        class=${classMap({
          "edit-mode": this._editMode,
        })}
      >
        <div class="header">
          <div class="toolbar">
            ${this._editMode
              ? html`
                  <div class="main-area">
                    <div class="main-title">
                      ${dashboardTitle ||
                      this.hass!.localize("ui.panel.lovelace.editor.header")}
                      <ha-icon-button
                        .label=${this.hass!.localize(
                          "ui.panel.lovelace.editor.edit_lovelace.edit_title"
                        )}
                        .path=${mdiPencil}
                        class="edit-icon"
                        @click=${this._editDashboard}
                      ></ha-icon-button>
                    </div>
                  </div>
                  <div class="action-items">${this._renderActionItems()}</div>
                `
              : html`
                  ${curViewConfig?.subview
                    ? html`
                        <ha-icon-button-arrow-prev
                          slot="navigationIcon"
                          @click=${this._goBack}
                        ></ha-icon-button-arrow-prev>
                      `
                    : html`
                        <ha-menu-button
                          slot="navigationIcon"
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                        ></ha-menu-button>
                      `}
                  <div class="main-area">
                    ${curViewConfig?.subview
                      ? html`<div class="main-title">
                          ${curViewConfig.title}
                        </div>`
                      : (!this.narrow || window.innerWidth > 600) &&
                          visibleViews.length > 1
                        ? html`
                            <hui-lovelace-navigation
                              .hass=${this.hass}
                              .lovelace=${this.lovelace}
                              .navigationConfig=${{
                                mode: "desktop",
                                editMode: this._editMode,
                                narrow: this.narrow,
                                curView: this.curView,
                                route: this.route,
                              }}
                            ></hui-lovelace-navigation>
                          `
                        : html`
                            <div class="main-title">
                              ${this.narrow && curViewConfig?.title
                                ? curViewConfig.title
                                : (views[0]?.title ?? dashboardTitle)}
                            </div>
                          `}
                  </div>
                  <div class="action-items">${this._renderActionItems()}</div>
                `}
          </div>
          ${this._editMode
            ? html`<div class="edit-tab-bar">
                ${visibleViews.length > 1
                  ? html`
                      <hui-lovelace-navigation
                        .hass=${this.hass}
                        .lovelace=${this.lovelace}
                        .navigationConfig=${{
                          mode: this.narrow ? "mobile" : "desktop",
                          editMode: this._editMode,
                          narrow: this.narrow,
                          curView: this.curView,
                          route: this.route,
                        }}
                      ></hui-lovelace-navigation>
                    `
                  : nothing}
                <ha-icon-button
                  slot="nav"
                  id="add-view"
                  @click=${this._addView}
                  .label=${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_view.add"
                  )}
                  .path=${mdiPlus}
                ></ha-icon-button>
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }

  private get _yamlMode(): boolean {
    return this.lovelace!.mode === "yaml";
  }

  private get _editMode() {
    return this.lovelace!.editMode;
  }

  private _goBack(): void {
    const views = this.lovelace?.config.views ?? [];
    const curViewConfig =
      typeof this.curView === "number" ? views[this.curView] : undefined;

    if (curViewConfig?.back_path != null) {
      navigate(curViewConfig.back_path, { replace: true });
    } else if (history.length > 1) {
      history.back();
    } else if (!views[0].subview) {
      navigate(this.route!.prefix, { replace: true });
    } else {
      navigate("/");
    }
  }

  private _handleRefresh(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    fireEvent(this, "config-refresh");
  }

  private _handleReloadResources(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this.hass.callService("lovelace", "reload_resources");
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.lovelace.reload_resources.refresh_header"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.reload_resources.refresh_body"
      ),
      confirmText: this.hass.localize("ui.common.refresh"),
      dismissText: this.hass.localize("ui.common.not_now"),
      confirm: () => location.reload(),
    });
  }

  private _handleShowQuickBar(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._showQuickBar();
  }

  private _showQuickBar(): void {
    const params = {
      keyboard_shortcut: html`<a href="#" @click=${this._openShortcutDialog}
        >${this.hass.localize("ui.tips.keyboard_shortcut")}</a
      >`,
    };

    showQuickBar(this, {
      mode: QuickBarMode.Entity,
      hint: this.hass.enableShortcuts
        ? this.hass.localize("ui.tips.key_e_tip", params)
        : undefined,
    });
  }

  private _handleRawEditor(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this.lovelace!.enableFullEditMode();
  }

  private _handleManageDashboards(
    ev: CustomEvent<RequestSelectedDetail>
  ): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate("/config/lovelace/dashboards");
  }

  private _handleManageResources(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate("/config/lovelace/resources");
  }

  private _handleUnusedEntities(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate(`${this.route?.prefix}/hass-unused-entities`);
  }

  private _handleShowVoiceCommandDialog(
    ev: CustomEvent<RequestSelectedDetail>
  ): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._showVoiceCommandDialog();
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this, this.hass, { pipeline_id: "last_used" });
  }

  private _handleEnableEditMode(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._enableEditMode();
  }

  private async _enableEditMode() {
    if (this._yamlMode) {
      showAlertDialog(this, {
        text: this.hass!.localize("ui.panel.lovelace.editor.yaml_unsupported"),
      });
      return;
    }
    if (
      isStrategyDashboard(this.lovelace!.rawConfig) &&
      !isLegacyStrategyConfig(this.lovelace!.rawConfig.strategy)
    ) {
      const strategyClass = await getLovelaceStrategy(
        "dashboard",
        this.lovelace!.rawConfig.strategy.type
      ).catch((_err) => undefined);
      if (strategyClass?.noEditor) {
        showSaveDialog(this, {
          lovelace: this.lovelace!,
          mode: "storage",
          narrow: this.narrow!,
        });
        return;
      }

      const urlPath = this.route?.prefix.slice(1);
      await this.hass.loadFragmentTranslation("config");
      const dashboards = await fetchDashboards(this.hass);
      const dashboard = dashboards.find((d) => d.url_path === urlPath);

      showDashboardStrategyEditorDialog(this, {
        config: this.lovelace!.rawConfig,
        saveConfig: this.lovelace!.saveConfig,
        takeControl: () => {
          showSaveDialog(this, {
            lovelace: this.lovelace!,
            mode: "storage",
            narrow: this.narrow!,
          });
        },
        deleteDashboard: async () => {
          const confirm = await showConfirmationDialog(this, {
            title: this.hass!.localize(
              "ui.panel.config.lovelace.dashboards.confirm_delete_title",
              { dashboard_title: dashboard!.title }
            ),
            text: this.hass!.localize(
              "ui.panel.config.lovelace.dashboards.confirm_delete_text"
            ),
            confirmText: this.hass!.localize("ui.common.delete"),
            destructive: true,
          });
          if (!confirm) {
            return false;
          }
          try {
            await deleteDashboard(this.hass!, dashboard!.id);
            return true;
          } catch (_err: any) {
            return false;
          }
        },
      });
      return;
    }
    this.lovelace!.setEditMode(true);
  }

  private _editModeDisable(): void {
    this.lovelace!.setEditMode(false);
  }

  private async _editDashboard() {
    const urlPath = this.route?.prefix.slice(1);
    await this.hass.loadFragmentTranslation("config");
    const dashboards = await fetchDashboards(this.hass);
    const dashboard = dashboards.find((d) => d.url_path === urlPath);

    showDashboardDetailDialog(this, {
      dashboard,
      urlPath,
      updateDashboard: async (values) => {
        await updateDashboard(this.hass!, dashboard!.id, values);
      },
      removeDashboard: async () => {
        const confirm = await showConfirmationDialog(this, {
          title: this.hass!.localize(
            "ui.panel.config.lovelace.dashboards.confirm_delete_title",
            { dashboard_title: dashboard!.title }
          ),
          text: this.hass!.localize(
            "ui.panel.config.lovelace.dashboards.confirm_delete_text"
          ),
          confirmText: this.hass!.localize("ui.common.delete"),
          destructive: true,
        });
        if (!confirm) {
          return false;
        }
        try {
          await deleteDashboard(this.hass!, dashboard!.id);
          return true;
        } catch (_err: any) {
          return false;
        }
      },
    });
  }

  private _addView(): void {
    fireEvent(this, "add-view" as keyof HASSDomEvents);
  }

  private _openShortcutDialog(ev: Event): void {
    ev.preventDefault();
    showShortcutsDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .header {
          background-color: var(--primary-background-color);
          color: var(--primary-text-color);
          border-bottom: var(--app-header-border-bottom, none);
          position: fixed;
          top: 0;
          width: var(--mdc-top-app-bar-width, 100%);
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
          padding-top: var(--safe-area-inset-top);
          z-index: 4;
          transition: box-shadow 200ms linear;
        }
        @media (min-width: 600px) {
          .header {
            background-color: var(--app-header-background-color);
            color: var(--app-header-text-color, white);
          }
        }
        :host([scrolled]) .header {
          box-shadow: var(
            --mdc-top-app-bar-fixed-box-shadow,
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12)
          );
        }
        .edit-mode .header {
          background-color: var(--app-header-edit-background-color, #455a64);
          color: var(--app-header-edit-text-color, white);
        }
        .toolbar {
          height: var(--header-height);
          display: flex;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 0px 12px;
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 0 4px;
          }
        }
        .main-area {
          margin: var(--margin-title);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .main-title {
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }
        .action-items {
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        .edit-mode div[main-area] {
          pointer-events: auto;
        }
        .edit-tab-bar {
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }
        @media (max-width: 599px) {
          .edit-tab-bar {
            padding: 0 4px;
          }
        }
        .edit-icon {
          color: var(--accent-color);
          padding: 0 8px;
          vertical-align: middle;
          --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
          direction: var(--direction);
        }
        .edit-icon:last-child {
          padding-left: 0;
        }
        #add-view {
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        #add-view ha-svg-icon {
          background-color: var(--accent-color);
          border-radius: 4px;
        }
        a {
          color: var(--text-primary-color, white);
        }
        mwc-button.warning:not([disabled]) {
          color: var(--error-color);
        }
        .menu-link {
          text-decoration: none;
        }
        .exit-edit-mode {
          --mdc-theme-primary: var(--app-header-edit-text-color, #fff);
          --mdc-button-outline-color: var(--app-header-edit-text-color, #fff);
          --mdc-typography-button-font-size: var(--ha-font-size-m);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-header": HuiHeader;
  }
}
