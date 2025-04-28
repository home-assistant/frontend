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
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  addSearchParam,
  extractSearchParamsObject,
  removeSearchParam,
} from "../../common/url/search-params";
import { debounce } from "../../common/util/debounce";
import { afterNextRender } from "../../common/util/render-status";
import "../../components/ha-button-menu";
import "../../components/ha-icon";
import "../../components/ha-icon-button";
import "../../components/ha-icon-button-arrow-next";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-svg-icon";
import "../../components/sl-tab-group";
import type { LovelacePanelConfig } from "../../data/lovelace";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
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
import { swapView } from "./editor/config-util";
import { showDashboardStrategyEditorDialog } from "./editor/dashboard-strategy-editor/dialogs/show-dialog-dashboard-strategy-editor";
import { showSaveDialog } from "./editor/show-save-config-dialog";
import { showEditViewDialog } from "./editor/view-editor/show-edit-view-dialog";
import { getLovelaceStrategy } from "./strategies/get-strategy";
import { isLegacyStrategyConfig } from "./strategies/legacy-strategy";
import type { Lovelace } from "./types";
import "./views/hui-view";
import type { HUIView } from "./views/hui-view";
import "./views/hui-view-background";
import "./views/hui-view-container";

@customElement("hui-root")
class HUIRoot extends LitElement {
  @property({ attribute: false }) public panel?: PanelInfo<LovelacePanelConfig>;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route?: {
    path: string;
    prefix: string;
  };

  @state() private _curView?: number | "hass-unused-entities";

  private _viewCache?: Record<string, HUIView>;

  private _viewScrollPositions: Record<string, number> = {};

  private _restoreScroll = false;

  private _debouncedConfigChanged: () => void;

  private _conversation = memoizeOne((_components) =>
    isComponentLoaded(this.hass, "conversation")
  );

  constructor() {
    super();
    // The view can trigger a re-render when it knows that certain
    // web components have been loaded.
    this._debouncedConfigChanged = debounce(
      () => this._selectView(this._curView, true),
      100,
      false
    );
  }

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
      typeof this._curView === "number" ? views[this._curView] : undefined;

    const dashboardTitle = this.panel
      ? getPanelTitle(this.hass, this.panel)
      : undefined;

    const background = curViewConfig?.background || this.config.background;

    const tabs = html`<sl-tab-group @sl-tab-show=${this._handleViewSelected}>
      ${views.map(
        (view, index) => html`
          <sl-tab
            slot="nav"
            panel=${index}
            .active=${this._curView === index}
            aria-label=${ifDefined(view.title)}
            class=${classMap({
              icon: Boolean(view.icon),
              "hide-tab": Boolean(
                !this._editMode &&
                  view.visible !== undefined &&
                  ((Array.isArray(view.visible) &&
                    !view.visible.some(
                      (e) => e.user === this.hass!.user?.id
                    )) ||
                    view.visible === false)
              ),
            })}
          >
            ${this._editMode
              ? html`
                  <ha-icon-button-arrow-prev
                    .hass=${this.hass}
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_view.move_left"
                    )}
                    class="edit-icon view"
                    @click=${this._moveViewLeft}
                    .disabled=${this._curView === 0}
                  ></ha-icon-button-arrow-prev>
                `
              : nothing}
            ${view.icon
              ? html`
                  <ha-icon
                    class=${classMap({
                      "child-view-icon": Boolean(view.subview),
                    })}
                    title=${ifDefined(view.title)}
                    .icon=${view.icon}
                  ></ha-icon>
                `
              : view.title ||
                this.hass.localize("ui.panel.lovelace.views.unnamed_view")}
            ${this._editMode
              ? html`
                  <ha-icon-button
                    .title=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_view.edit"
                    )}
                    class="edit-icon view"
                    .path=${mdiPencil}
                    @click=${this._editView}
                  ></ha-icon-button>
                  <ha-icon-button-arrow-next
                    .hass=${this.hass}
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_view.move_right"
                    )}
                    class="edit-icon view"
                    @click=${this._moveViewRight}
                    .disabled=${(this._curView! as number) + 1 === views.length}
                  ></ha-icon-button-arrow-next>
                `
              : nothing}
          </sl-tab>
        `
      )}
    </sl-tab-group>`;

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
                  <div class="main-title">
                    ${dashboardTitle ||
                    this.hass!.localize("ui.panel.lovelace.editor.header")}
                    <ha-icon-button
                      slot="actionItems"
                      .label=${this.hass!.localize(
                        "ui.panel.lovelace.editor.edit_lovelace.edit_title"
                      )}
                      .path=${mdiPencil}
                      class="edit-icon"
                      @click=${this._editDashboard}
                    ></ha-icon-button>
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
                  ${curViewConfig?.subview
                    ? html`<div class="main-title">${curViewConfig.title}</div>`
                    : views.filter((view) => !view.subview).length > 1
                      ? tabs
                      : html`
                          <div class="main-title">
                            ${views[0]?.title ?? dashboardTitle}
                          </div>
                        `}
                  <div class="action-items">${this._renderActionItems()}</div>
                `}
          </div>
          ${this._editMode
            ? html`<div class="edit-tab-bar">
                ${tabs}
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
        <hui-view-container
          .hass=${this.hass}
          .theme=${curViewConfig?.theme}
          id="view"
          @ll-rebuild=${this._debouncedConfigChanged}
        >
          <hui-view-background .hass=${this.hass} .background=${background}>
          </hui-view-background>
        </hui-view-container>
      </div>
    `;
  }

  private _handleWindowScroll = () => {
    this.toggleAttribute("scrolled", window.scrollY !== 0);
  };

  private _handlePopState = () => {
    this._restoreScroll = true;
  };

  private _isVisible = (view: LovelaceViewConfig) =>
    Boolean(
      this._editMode ||
        view.visible === undefined ||
        view.visible === true ||
        (Array.isArray(view.visible) &&
          view.visible.some((show) => show.user === this.hass!.user?.id))
    );

  private _clearParam(param: string) {
    window.history.replaceState(
      null,
      "",
      constructUrlCurrentPath(removeSearchParam(param))
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    // Check for requested edit mode
    const searchParams = extractSearchParamsObject();
    if (searchParams.edit === "1") {
      this._clearParam("edit");
      if (this.hass!.user?.is_admin && this.lovelace!.mode === "storage") {
        this.lovelace!.setEditMode(true);
      }
    } else if (searchParams.conversation === "1") {
      this._clearParam("conversation");
      this._showVoiceCommandDialog();
    }
    window.addEventListener("scroll", this._handleWindowScroll, {
      passive: true,
    });
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("scroll", this._handleWindowScroll, {
      passive: true,
    });
    window.addEventListener("popstate", this._handlePopState);
    // Disable history scroll restoration because it is managed manually here
    window.history.scrollRestoration = "manual";
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("scroll", this._handleWindowScroll);
    window.removeEventListener("popstate", this._handlePopState);
    this.toggleAttribute("scrolled", window.scrollY !== 0);
    // Re-enable history scroll restoration when leaving the page
    window.history.scrollRestoration = "auto";
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const view = this._viewRoot;
    const huiView = view.lastChild as HUIView;

    if (changedProperties.has("hass") && huiView) {
      huiView.hass = this.hass;
    }

    if (changedProperties.has("narrow") && huiView) {
      huiView.narrow = this.narrow;
    }

    let newSelectView;
    let force = false;

    let viewPath: string | undefined = this.route!.path.split("/")[1];
    viewPath = viewPath ? decodeURI(viewPath) : undefined;

    if (changedProperties.has("route")) {
      const views = this.config.views;

      if (!viewPath && views.length) {
        newSelectView = views.findIndex(this._isVisible);
        this._navigateToView(views[newSelectView].path || newSelectView, true);
      } else if (viewPath === "hass-unused-entities") {
        newSelectView = "hass-unused-entities";
      } else if (viewPath) {
        const selectedView = viewPath;
        const selectedViewInt = Number(selectedView);
        let index = 0;
        for (let i = 0; i < views.length; i++) {
          if (views[i].path === selectedView || i === selectedViewInt) {
            index = i;
            break;
          }
        }
        newSelectView = index;
      }
    }

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as
        | Lovelace
        | undefined;

      if (!oldLovelace || oldLovelace.config !== this.lovelace!.config) {
        // On config change, recreate the current view from scratch.
        force = true;
      }

      if (!oldLovelace || oldLovelace.editMode !== this.lovelace!.editMode) {
        const views = this.config && this.config.views;

        // Leave unused entities when leaving edit mode
        if (
          this.lovelace!.mode === "storage" &&
          viewPath === "hass-unused-entities"
        ) {
          newSelectView = views.findIndex(this._isVisible);
          this._navigateToView(
            views[newSelectView].path || newSelectView,
            true
          );
        }
      }

      if (!force && huiView) {
        huiView.lovelace = this.lovelace!;
      }
    }

    if (newSelectView !== undefined || force) {
      if (force && newSelectView === undefined) {
        newSelectView = this._curView;
      }
      // Will allow for ripples to start rendering
      afterNextRender(() => {
        if (changedProperties.has("route")) {
          const position =
            (this._restoreScroll && this._viewScrollPositions[newSelectView]) ||
            0;
          this._restoreScroll = false;
          requestAnimationFrame(() =>
            scrollTo({ behavior: "auto", top: position })
          );
        }
        this._selectView(newSelectView, force);
      });
    }
  }

  private get config(): LovelaceConfig {
    return this.lovelace!.config;
  }

  private get _yamlMode(): boolean {
    return this.lovelace!.mode === "yaml";
  }

  private get _editMode() {
    return this.lovelace!.editMode;
  }

  private get _viewRoot(): HTMLDivElement {
    return this.shadowRoot!.getElementById("view") as HTMLDivElement;
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

  private _goBack(): void {
    const views = this.lovelace?.config.views ?? [];
    const curViewConfig =
      typeof this._curView === "number" ? views[this._curView] : undefined;

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

  private _navigateToView(path: string | number, replace?: boolean) {
    const url = this.lovelace!.editMode
      ? `${this.route!.prefix}/${path}?${addSearchParam({ edit: "1" })}`
      : `${this.route!.prefix}/${path}${location.search}`;

    const currentUrl = `${location.pathname}${location.search}`;
    if (currentUrl !== url) {
      navigate(url, { replace });
    }
  }

  private _editView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      viewIndex: this._curView as number,
      saveCallback: (viewIndex: number, viewConfig: LovelaceViewConfig) => {
        const path = viewConfig.path || viewIndex;
        this._navigateToView(path);
      },
    });
  }

  private _moveViewLeft(ev) {
    ev.stopPropagation();
    if (this._curView === 0) {
      return;
    }
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) - 1;
    this._curView = newIndex;
    if (!this.config.views[oldIndex].path) {
      this._navigateToView(newIndex, true);
    }
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _moveViewRight(ev) {
    ev.stopPropagation();
    if ((this._curView! as number) + 1 === this.lovelace!.config.views.length) {
      return;
    }
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) + 1;
    this._curView = newIndex;
    if (!this.config.views[oldIndex].path) {
      this._navigateToView(newIndex, true);
    }
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _addView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      saveCallback: (viewIndex: number, viewConfig: LovelaceViewConfig) => {
        const path = viewConfig.path || viewIndex;
        this._navigateToView(path);
      },
    });
  }

  private _handleViewSelected(ev) {
    ev.preventDefault();
    const viewIndex = Number(ev.detail.name);
    if (viewIndex !== this._curView) {
      const path = this.config.views[viewIndex].path || viewIndex;
      this._navigateToView(path);
    } else if (!this._editMode) {
      scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  private _selectView(viewIndex: HUIRoot["_curView"], force: boolean): void {
    if (!force && this._curView === viewIndex) {
      return;
    }

    // Save scroll position of current view
    if (this._curView != null) {
      this._viewScrollPositions[this._curView] = window.scrollY;
    }

    viewIndex = viewIndex === undefined ? 0 : viewIndex;

    this._curView = viewIndex;

    if (force) {
      this._viewCache = {};
      this._viewScrollPositions = {};
    }

    // Recreate a new element to clear the applied themes.
    const root = this._viewRoot;

    if (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (viewIndex === "hass-unused-entities") {
      const unusedEntities = document.createElement("hui-unused-entities");
      // Wait for promise to resolve so that the element has been upgraded.
      import("./editor/unused-entities/hui-unused-entities").then(() => {
        unusedEntities.hass = this.hass!;
        unusedEntities.lovelace = this.lovelace!;
        unusedEntities.narrow = this.narrow;
      });
      root.appendChild(unusedEntities);
      return;
    }

    let view;
    const viewConfig = this.config.views[viewIndex];

    if (!viewConfig) {
      this.lovelace!.setEditMode(true);
      return;
    }

    if (!force && this._viewCache![viewIndex]) {
      view = this._viewCache![viewIndex];
    } else {
      view = document.createElement("hui-view");
      view.index = viewIndex;
      this._viewCache![viewIndex] = view;
    }

    view.lovelace = this.lovelace;
    view.hass = this.hass;
    view.narrow = this.narrow;

    root.appendChild(view);
  }

  private _openShortcutDialog(ev: Event) {
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
          background-color: var(--app-header-background-color);
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          position: fixed;
          top: 0;
          width: var(--mdc-top-app-bar-width, 100%);
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
          padding-top: env(safe-area-inset-top);
          z-index: 4;
          transition: box-shadow 200ms linear;
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
          font-size: 20px;
          padding: 0px 12px;
          font-weight: 400;
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 0 4px;
          }
        }
        .main-title {
          margin: var(--margin-title);
          line-height: 20px;
          flex-grow: 1;
        }
        .action-items {
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        sl-tab-group {
          --ha-tab-indicator-color: var(
            --app-header-selection-bar-color,
            var(--app-header-text-color, white)
          );
          --ha-tab-active-text-color: var(--app-header-text-color, white);
          --ha-tab-track-color: transparent;
          align-self: flex-end;
          flex-grow: 1;
          min-width: 0;
          height: 100%;
        }
        sl-tab-group::part(nav) {
          padding: 0;
        }
        sl-tab-group::part(scroll-button) {
          background-color: var(--app-header-background-color);
          background: linear-gradient(
            90deg,
            var(--app-header-background-color),
            transparent
          );
          z-index: 1;
        }
        sl-tab-group::part(scroll-button--end) {
          background: linear-gradient(
            270deg,
            var(--app-header-background-color),
            transparent
          );
        }
        .edit-mode sl-tab-group::part(scroll-button) {
          background-color: var(--app-header-edit-background-color, #455a64);
          background: linear-gradient(
            90deg,
            var(--app-header-edit-background-color, #455a64),
            transparent
          );
        }
        .edit-mode sl-tab-group::part(scroll-button--end) {
          background: linear-gradient(
            270deg,
            var(--app-header-edit-background-color, #455a64),
            transparent
          );
        }
        .edit-mode div[main-title] {
          pointer-events: auto;
        }
        .edit-tab-bar {
          display: flex;
        }
        .edit-mode sl-tab-group {
          flex-grow: 0;
          color: var(--app-header-edit-text-color, #fff);
        }
        .edit-mode sl-tab {
          height: 54px;
        }
        sl-tab {
          height: calc(var(--header-height, 56px) - 2px);
        }
        sl-tab[aria-selected="true"] .edit-icon {
          display: inline-flex;
        }
        sl-tab::part(base) {
          padding-top: calc((var(--header-height) - 20px) / 2);
          padding-bottom: calc((var(--header-height) - 20px) / 2 - 2px);
        }
        sl-tab.icon::part(base) {
          padding-top: calc((var(--header-height) - 20px) / 2 - 2px);
          padding-bottom: calc((var(--header-height) - 20px) / 2 - 4px);
        }
        .edit-mode sl-tab[aria-selected="true"]::part(base) {
          padding: 4px 0 2px 0;
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
        .edit-icon.view {
          display: none;
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
        hui-view-container {
          position: relative;
          display: flex;
          min-height: 100vh;
          box-sizing: border-box;
          padding-top: calc(var(--header-height) + env(safe-area-inset-top));
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          padding-inline-start: env(safe-area-inset-left);
          padding-inline-end: env(safe-area-inset-right);
          padding-bottom: env(safe-area-inset-bottom);
        }
        hui-view-container > * {
          flex: 1 1 100%;
          max-width: 100%;
        }
        /**
         * In edit mode we have the tab bar on a new line *
         */
        .edit-mode hui-view-container {
          padding-top: calc(
            var(--header-height) + 48px + env(safe-area-inset-top)
          );
        }
        .hide-tab {
          display: none;
        }
        .menu-link {
          text-decoration: none;
        }
        .exit-edit-mode {
          --mdc-theme-primary: var(--app-header-edit-text-color, #fff);
          --mdc-button-outline-color: var(--app-header-edit-text-color, #fff);
          --mdc-typography-button-font-size: 14px;
        }
        .child-view-icon {
          opacity: 0.5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-root": HUIRoot;
  }
}
