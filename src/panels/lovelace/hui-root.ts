import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import {
  mdiClose,
  mdiCodeBraces,
  mdiCog,
  mdiDotsVertical,
  mdiFileMultiple,
  mdiFormatListBulletedTriangle,
  mdiHelp,
  mdiHelpCircle,
  mdiMicrophone,
  mdiPencil,
  mdiPlus,
  mdiRefresh,
  mdiShape,
  mdiViewDashboard,
} from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-scroll-effects/effects/waterfall";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-tabs/paper-tab";
import "@polymer/paper-tabs/paper-tabs";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import scrollToTarget from "../../common/dom/scroll-to-target";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { navigate } from "../../common/navigate";
import { computeRTLDirection } from "../../common/util/compute_rtl";
import { debounce } from "../../common/util/debounce";
import { afterNextRender } from "../../common/util/render-status";
import "../../components/ha-button-menu";
import "../../components/ha-icon";
import "../../components/ha-icon-button-arrow-next";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-svg-icon";
import "../../components/ha-tabs";
import type {
  LovelaceConfig,
  LovelacePanelConfig,
  LovelaceViewConfig,
} from "../../data/lovelace";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import "../../layouts/ha-app-layout";
import type { haAppLayout } from "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { swapView } from "./editor/config-util";
import { showEditLovelaceDialog } from "./editor/lovelace-editor/show-edit-lovelace-dialog";
import { showEditViewDialog } from "./editor/view-editor/show-edit-view-dialog";
import type { Lovelace } from "./types";
import "./views/hui-view";
import type { HUIView } from "./views/hui-view";

class HUIRoot extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow = false;

  @property() public route?: { path: string; prefix: string };

  @internalProperty() private _curView?: number | "hass-unused-entities";

  @query("ha-app-layout", true) private _appLayout!: haAppLayout;

  private _viewCache?: { [viewId: string]: HUIView };

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

  protected render(): TemplateResult {
    return html`
      <ha-app-layout
        class=${classMap({
          "edit-mode": this._editMode,
        })}
        id="layout"
      >
        <app-header slot="header" effects="waterfall" fixed condenses>
          ${this._editMode
            ? html`
                <app-toolbar class="edit-mode">
                  <mwc-icon-button
                    .label="${this.hass!.localize(
                      "ui.panel.lovelace.menu.exit_edit_mode"
                    )}"
                    title="${this.hass!.localize(
                      "ui.panel.lovelace.menu.close"
                    )}"
                    @click="${this._editModeDisable}"
                  >
                    <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                  </mwc-icon-button>
                  <div main-title>
                    ${this.config.title ||
                    this.hass!.localize("ui.panel.lovelace.editor.header")}
                    <mwc-icon-button
                      aria-label="${this.hass!.localize(
                        "ui.panel.lovelace.editor.edit_lovelace.edit_title"
                      )}"
                      title="${this.hass!.localize(
                        "ui.panel.lovelace.editor.edit_lovelace.edit_title"
                      )}"
                      class="edit-icon"
                      @click="${this._editLovelace}"
                    >
                      <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                    </mwc-icon-button>
                  </div>
                  <a
                    href="${documentationUrl(this.hass, "/lovelace/")}"
                    rel="noreferrer"
                    class="menu-link"
                    target="_blank"
                  >
                    <mwc-icon-button
                      title="${this.hass!.localize(
                        "ui.panel.lovelace.menu.help"
                      )}"
                    >
                      <ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>
                    </mwc-icon-button>
                  </a>
                  <ha-button-menu corner="BOTTOM_START">
                    <mwc-icon-button
                      slot="trigger"
                      .title="${this.hass!.localize(
                        "ui.panel.lovelace.editor.menu.open"
                      )}"
                      .label=${this.hass!.localize(
                        "ui.panel.lovelace.editor.menu.open"
                      )}
                    >
                      <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
                    </mwc-icon-button>
                    ${__DEMO__ /* No unused entities available in the demo */
                      ? ""
                      : html`
                          <mwc-list-item
                            graphic="icon"
                            aria-label=${this.hass!.localize(
                              "ui.panel.lovelace.unused_entities.title"
                            )}
                            @request-selected="${this._handleUnusedEntities}"
                          >
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiFormatListBulletedTriangle}
                            >
                            </ha-svg-icon>
                            ${this.hass!.localize(
                              "ui.panel.lovelace.unused_entities.title"
                            )}
                          </mwc-list-item>
                        `}
                    <mwc-list-item
                      graphic="icon"
                      @request-selected="${this._handleRawEditor}"
                    >
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiCodeBraces}
                      ></ha-svg-icon>
                      ${this.hass!.localize(
                        "ui.panel.lovelace.editor.menu.raw_editor"
                      )}
                    </mwc-list-item>
                    ${__DEMO__ /* No config available in the demo */
                      ? ""
                      : html`<mwc-list-item
                            graphic="icon"
                            @request-selected="${this._handleManageDashboards}"
                          >
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiViewDashboard}
                            ></ha-svg-icon>
                            ${this.hass!.localize(
                              "ui.panel.lovelace.editor.menu.manage_dashboards"
                            )}
                          </mwc-list-item>
                          ${this.hass.userData?.showAdvanced
                            ? html`<mwc-list-item
                                graphic="icon"
                                @request-selected="${this
                                  ._handleManageResources}"
                              >
                                <ha-svg-icon
                                  slot="graphic"
                                  .path=${mdiFileMultiple}
                                ></ha-svg-icon>
                                ${this.hass!.localize(
                                  "ui.panel.lovelace.editor.menu.manage_resources"
                                )}
                              </mwc-list-item>`
                            : ""} `}
                  </ha-button-menu>
                </app-toolbar>
              `
            : html`
                <app-toolbar>
                  <ha-menu-button
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                  ></ha-menu-button>
                  ${this.lovelace!.config.views.length > 1
                    ? html`
                        <ha-tabs
                          scrollable
                          .selected="${this._curView}"
                          @iron-activate="${this._handleViewSelected}"
                          dir="${computeRTLDirection(this.hass!)}"
                        >
                          ${this.lovelace!.config.views.map(
                            (view) => html`
                              <paper-tab
                                aria-label="${view.title}"
                                class="${classMap({
                                  "hide-tab": Boolean(
                                    view.visible !== undefined &&
                                      ((Array.isArray(view.visible) &&
                                        !view.visible.some(
                                          (e) => e.user === this.hass!.user!.id
                                        )) ||
                                        view.visible === false)
                                  ),
                                })}"
                              >
                                ${view.icon
                                  ? html`
                                      <ha-icon
                                        title="${view.title}"
                                        .icon="${view.icon}"
                                      ></ha-icon>
                                    `
                                  : view.title || "Unnamed view"}
                              </paper-tab>
                            `
                          )}
                        </ha-tabs>
                      `
                    : html`<div main-title>${this.config.title}</div>`}
                  ${!this.narrow &&
                  this._conversation(this.hass.config.components)
                    ? html`
                        <mwc-icon-button
                          .label=${this.hass!.localize(
                            "ui.panel.lovelace.menu.start_conversation"
                          )}
                          @click=${this._showVoiceCommandDialog}
                        >
                          <ha-svg-icon .path=${mdiMicrophone}></ha-svg-icon>
                        </mwc-icon-button>
                      `
                    : ""}
                  <ha-button-menu corner="BOTTOM_START">
                    <mwc-icon-button
                      slot="trigger"
                      .label=${this.hass!.localize(
                        "ui.panel.lovelace.editor.menu.open"
                      )}
                      .title="${this.hass!.localize(
                        "ui.panel.lovelace.editor.menu.open"
                      )}"
                    >
                      <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
                    </mwc-icon-button>
                    ${this.narrow &&
                    this._conversation(this.hass.config.components)
                      ? html`
                          <mwc-list-item
                            .label=${this.hass!.localize(
                              "ui.panel.lovelace.menu.start_conversation"
                            )}
                            graphic="icon"
                            @request-selected=${this._showVoiceCommandDialog}
                          >
                            <span
                              >${this.hass!.localize(
                                "ui.panel.lovelace.menu.start_conversation"
                              )}</span
                            >
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiMicrophone}
                            ></ha-svg-icon>
                          </mwc-list-item>
                        `
                      : ""}
                    ${this._yamlMode
                      ? html`
                          <mwc-list-item
                            aria-label=${this.hass!.localize(
                              "ui.common.refresh"
                            )}
                            graphic="icon"
                            @request-selected="${this._handleRefresh}"
                          >
                            <span
                              >${this.hass!.localize("ui.common.refresh")}</span
                            >
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiRefresh}
                            ></ha-svg-icon>
                          </mwc-list-item>
                          <mwc-list-item
                            aria-label=${this.hass!.localize(
                              "ui.panel.lovelace.unused_entities.title"
                            )}
                            graphic="icon"
                            @request-selected="${this._handleUnusedEntities}"
                          >
                            <span
                              >${this.hass!.localize(
                                "ui.panel.lovelace.unused_entities.title"
                              )}</span
                            >
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiShape}
                            ></ha-svg-icon>
                          </mwc-list-item>
                        `
                      : ""}
                    ${(this.hass.panels.lovelace?.config as LovelacePanelConfig)
                      ?.mode === "yaml"
                      ? html`
                          <mwc-list-item
                            graphic="icon"
                            aria-label=${this.hass!.localize(
                              "ui.panel.lovelace.menu.reload_resources"
                            )}
                            @request-selected=${this._handleReloadResources}
                          >
                            ${this.hass!.localize(
                              "ui.panel.lovelace.menu.reload_resources"
                            )}
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiRefresh}
                            ></ha-svg-icon>
                          </mwc-list-item>
                        `
                      : ""}
                    ${this.hass!.user?.is_admin && !this.hass!.config.safe_mode
                      ? html`
                          <mwc-list-item
                            graphic="icon"
                            aria-label=${this.hass!.localize(
                              "ui.panel.lovelace.menu.configure_ui"
                            )}
                            @request-selected=${this._handleEnableEditMode}
                          >
                            ${this.hass!.localize(
                              "ui.panel.lovelace.menu.configure_ui"
                            )}
                            <ha-svg-icon
                              slot="graphic"
                              .path=${mdiCog}
                            ></ha-svg-icon>
                          </mwc-list-item>
                        `
                      : ""}
                    <a
                      href="${documentationUrl(this.hass, "/lovelace/")}"
                      rel="noreferrer"
                      class="menu-link"
                      target="_blank"
                    >
                      <mwc-list-item
                        graphic="icon"
                        aria-label=${this.hass!.localize(
                          "ui.panel.lovelace.menu.help"
                        )}
                      >
                        ${this.hass!.localize("ui.panel.lovelace.menu.help")}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiHelp}
                        ></ha-svg-icon>
                      </mwc-list-item>
                    </a>
                  </ha-button-menu>
                </app-toolbar>
              `}
          ${this._editMode
            ? html`
                <div sticky>
                  <paper-tabs
                    scrollable
                    .selected="${this._curView}"
                    @iron-activate="${this._handleViewSelected}"
                    dir="${computeRTLDirection(this.hass!)}"
                  >
                    ${this.lovelace!.config.views.map(
                      (view) => html`
                        <paper-tab
                          aria-label="${view.title}"
                          class="${classMap({
                            "hide-tab": Boolean(
                              !this._editMode &&
                                view.visible !== undefined &&
                                ((Array.isArray(view.visible) &&
                                  !view.visible.some(
                                    (e) => e.user === this.hass!.user!.id
                                  )) ||
                                  view.visible === false)
                            ),
                          })}"
                        >
                          ${this._editMode
                            ? html`
                                <ha-icon-button-arrow-prev
                                  .hass=${this.hass}
                                  .title="${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_view.move_left"
                                  )}"
                                  .label="${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_view.move_left"
                                  )}"
                                  class="edit-icon view"
                                  @click="${this._moveViewLeft}"
                                  ?disabled="${this._curView === 0}"
                                ></ha-icon-button-arrow-prev>
                              `
                            : ""}
                          ${view.icon
                            ? html`
                                <ha-icon
                                  title="${view.title}"
                                  .icon="${view.icon}"
                                ></ha-icon>
                              `
                            : view.title || "Unnamed view"}
                          ${this._editMode
                            ? html`
                                <ha-svg-icon
                                  title="${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_view.edit"
                                  )}"
                                  class="edit-icon view"
                                  .path=${mdiPencil}
                                  @click="${this._editView}"
                                ></ha-svg-icon>
                                <ha-icon-button-arrow-next
                                  .hass=${this.hass}
                                  .title="${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_view.move_right"
                                  )}"
                                  .label="${this.hass!.localize(
                                    "ui.panel.lovelace.editor.edit_view.move_right"
                                  )}"
                                  class="edit-icon view"
                                  @click="${this._moveViewRight}"
                                  ?disabled="${(this._curView! as number) +
                                    1 ===
                                  this.lovelace!.config.views.length}"
                                ></ha-icon-button-arrow-next>
                              `
                            : ""}
                        </paper-tab>
                      `
                    )}
                    ${this._editMode
                      ? html`
                          <mwc-icon-button
                            id="add-view"
                            @click="${this._addView}"
                            title="${this.hass!.localize(
                              "ui.panel.lovelace.editor.edit_view.add"
                            )}"
                          >
                            <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                          </mwc-icon-button>
                        `
                      : ""}
                  </paper-tabs>
                </div>
              `
            : ""}
        </app-header>
        <div id="view" @ll-rebuild="${this._debouncedConfigChanged}"></div>
      </ha-app-layout>
    `;
  }

  private _isVisible = (view: LovelaceViewConfig) =>
    Boolean(
      this._editMode ||
        view.visible === undefined ||
        view.visible === true ||
        (Array.isArray(view.visible) &&
          view.visible.some((show) => show.user === this.hass!.user?.id))
    );

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

    const viewPath = this.route!.path.split("/")[1];

    if (changedProperties.has("route")) {
      const views = this.config.views;

      if (!viewPath && views.length) {
        newSelectView = views.findIndex(this._isVisible);
        navigate(
          this,
          `${this.route!.prefix}/${views[newSelectView].path || newSelectView}`,
          true
        );
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

        fireEvent(this, "iron-resize");

        // Leave unused entities when leaving edit mode
        if (
          this.lovelace!.mode === "storage" &&
          viewPath === "hass-unused-entities"
        ) {
          newSelectView = views.findIndex(this._isVisible);
          navigate(
            this,
            `${this.route!.prefix}/${
              views[newSelectView].path || newSelectView
            }`,
            true
          );
        }
      }

      if (!force && huiView) {
        huiView.lovelace = this.lovelace;
      }
    }

    if (newSelectView !== undefined || force) {
      if (force && newSelectView === undefined) {
        newSelectView = this._curView;
      }
      // Will allow for ripples to start rendering
      afterNextRender(() => this._selectView(newSelectView, force));
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

  private get _layout(): any {
    return this.shadowRoot!.getElementById("layout");
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
    navigate(this, "/config/lovelace/dashboards");
  }

  private _handleManageResources(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate(this, "/config/lovelace/resources");
  }

  private _handleUnusedEntities(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    navigate(this, `${this.route?.prefix}/hass-unused-entities`);
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this);
  }

  private _handleEnableEditMode(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    if (this._yamlMode) {
      showAlertDialog(this, {
        text: "The edit UI is not available when in YAML mode.",
      });
      return;
    }
    this._enableEditMode();
  }

  private _enableEditMode(): void {
    this.lovelace!.setEditMode(true);
  }

  private _editModeDisable(): void {
    this.lovelace!.setEditMode(false);
  }

  private _editLovelace() {
    showEditLovelaceDialog(this, this.lovelace!);
  }

  private _editView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      viewIndex: this._curView as number,
    });
  }

  private _moveViewLeft() {
    if (this._curView === 0) {
      return;
    }
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) - 1;
    this._curView = newIndex;
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _moveViewRight() {
    if ((this._curView! as number) + 1 === this.lovelace!.config.views.length) {
      return;
    }
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) + 1;
    this._curView = newIndex;
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _addView() {
    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      saveCallback: (viewIndex: number, viewConfig: LovelaceViewConfig) => {
        const path = viewConfig.path || viewIndex;
        navigate(this, `${this.route?.prefix}/${path}`);
      },
    });
  }

  private _handleViewSelected(ev) {
    const viewIndex = ev.detail.selected as number;

    if (viewIndex !== this._curView) {
      const path = this.config.views[viewIndex].path || viewIndex;
      navigate(this, `${this.route?.prefix}/${path}`);
    }
    scrollToTarget(this, this._layout.header.scrollTarget);
  }

  private _selectView(viewIndex: HUIRoot["_curView"], force: boolean): void {
    if (!force && this._curView === viewIndex) {
      return;
    }

    viewIndex = viewIndex === undefined ? 0 : viewIndex;

    this._curView = viewIndex;

    if (force) {
      this._viewCache = {};
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
      this._enableEditMode();
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

    const configBackground = viewConfig.background || this.config.background;

    if (configBackground) {
      this._appLayout.style.setProperty(
        "--lovelace-background",
        configBackground
      );
    } else {
      this._appLayout.style.removeProperty("--lovelace-background");
    }

    root.appendChild(view);
    // Recalculate to see if we need to adjust content area for tab bar
    fireEvent(this, "iron-resize");
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }

        ha-app-layout {
          min-height: 100%;
        }
        ha-tabs {
          width: 100%;
          height: 100%;
          margin-left: 4px;
        }
        paper-tabs {
          margin-left: 12px;
          margin-left: max(env(safe-area-inset-left), 12px);
          margin-right: env(safe-area-inset-right);
        }
        ha-tabs,
        paper-tabs {
          --paper-tabs-selection-bar-color: var(
            --app-header-selection-bar-color,
            var(--app-header-text-color, #fff)
          );
          text-transform: uppercase;
        }

        .edit-mode app-header,
        .edit-mode app-toolbar {
          background-color: var(--app-header-edit-background-color, #455a64);
          color: var(--app-header-edit-text-color, #fff);
        }
        .edit-mode div[main-title] {
          pointer-events: auto;
        }
        paper-tab.iron-selected .edit-icon {
          display: inline-flex;
        }
        .edit-icon {
          color: var(--accent-color);
          padding-left: 8px;
          vertical-align: middle;
          --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
        }
        .edit-icon.view {
          display: none;
        }
        #add-view {
          position: absolute;
          height: 44px;
        }
        #add-view ha-svg-icon {
          background-color: var(--accent-color);
          border-radius: 4px;
        }
        app-toolbar a {
          color: var(--text-primary-color, white);
        }
        mwc-button.warning:not([disabled]) {
          color: var(--error-color);
        }
        #view {
          min-height: calc(100vh - var(--header-height));
          /**
          * Since we only set min-height, if child nodes need percentage
          * heights they must use absolute positioning so we need relative
          * positioning here.
          *
          * https://www.w3.org/TR/CSS2/visudet.html#the-height-property
          */
          position: relative;
          display: flex;
        }
        /**
         * In edit mode we have the tab bar on a new line *
         */
        .edit-mode #view {
          min-height: calc(100vh - var(--header-height) - 48px);
        }
        #view > * {
          /**
          * The view could get larger than the window in Firefox
          * to prevent that we set the max-width to 100%
          * flex-grow: 1 and flex-basis: 100% should make sure the view
          * stays full width.
          *
          * https://github.com/home-assistant/home-assistant-polymer/pull/3806
          */
          flex: 1 1 100%;
          max-width: 100%;
        }
        .hide-tab {
          display: none;
        }
        .menu-link {
          text-decoration: none;
        }
        hui-view {
          background: var(
            --lovelace-background,
            var(--primary-background-color)
          );
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

customElements.define("hui-root", HUIRoot);
