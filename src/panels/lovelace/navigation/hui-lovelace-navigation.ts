import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { mdiPencil } from "@mdi/js";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { Lovelace } from "../types";
import type { LovelaceConfig } from "../../../data/lovelace/config/types";
import { addSearchParam } from "../../../common/url/search-params";
import { navigate } from "../../../common/navigate";
import { showEditViewDialog } from "../editor/view-editor/show-edit-view-dialog";
import { swapView } from "../editor/config-util";
import { haStyle } from "../../../resources/styles";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-arrow-next";
import "../../../components/ha-icon-button-arrow-prev";
import "../../../components/sl-tab-group";

export interface NavigationConfig {
  mode: "desktop" | "mobile";
  editMode: boolean;
  narrow: boolean;
  curView?: number;
  route?: {
    path: string;
    prefix: string;
  };
}

@customElement("hui-lovelace-navigation")
export class HuiLovelaceNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public navigationConfig!: NavigationConfig;

  @state() private _curView?: number | "hass-unused-entities";

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("navigationConfig")) {
      this._curView = this.navigationConfig.curView;
      this.setAttribute("mode", this.navigationConfig.mode);
      if (this.navigationConfig.editMode) {
        this.setAttribute("edit-mode", "");
      } else {
        this.removeAttribute("edit-mode");
      }

      if (
        this.navigationConfig.mode === "mobile" &&
        this.navigationConfig.editMode &&
        typeof this._curView === "number"
      ) {
        this._scrollToActiveTab();
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    const views = this.lovelace?.config.views ?? [];

    const _isTabHiddenForUser = (view: LovelaceViewConfig) =>
      view.visible !== undefined &&
      ((Array.isArray(view.visible) &&
        !view.visible.some((e) => e.user === this.hass!.user?.id)) ||
        view.visible === false);

    const visibleViews = views.filter(
      (view) => !view.subview && !_isTabHiddenForUser(view)
    );

    if (this.navigationConfig.mode === "mobile" && visibleViews.length <= 1) {
      return nothing;
    }

    return this.navigationConfig.mode === "desktop"
      ? this._renderDesktopTabs(views, _isTabHiddenForUser)
      : this._renderMobileTabs(views, _isTabHiddenForUser);
  }

  private _renderDesktopTabs(
    views: LovelaceViewConfig[],
    _isTabHiddenForUser: (view: LovelaceViewConfig) => boolean
  ): TemplateResult {
    return html`<sl-tab-group @sl-tab-show=${this._handleViewSelected}>
      ${views.map((view, index) => {
        const hidden =
          !this.navigationConfig.editMode &&
          (view.subview || _isTabHiddenForUser(view));
        return html`
          <sl-tab
            slot="nav"
            panel=${index}
            .active=${this._curView === index}
            .disabled=${hidden}
            aria-label=${ifDefined(view.title)}
            class=${classMap({
              icon: Boolean(view.icon),
              "hide-tab": Boolean(hidden),
            })}
          >
            ${this._curView === index && this.navigationConfig.editMode
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
            ${this._curView === index && this.navigationConfig.editMode
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
        `;
      })}
    </sl-tab-group>`;
  }

  private _renderMobileTabs(
    views: LovelaceViewConfig[],
    _isTabHiddenForUser: (view: LovelaceViewConfig) => boolean
  ): TemplateResult {
    if (this.navigationConfig.editMode) {
      return html`<sl-tab-group @sl-tab-show=${this._handleViewSelected}>
        ${views.map((view, index) => {
          const hidden =
            !this.navigationConfig.editMode &&
            (view.subview || _isTabHiddenForUser(view));
          return html`
            <sl-tab
              slot="nav"
              panel=${index}
              .active=${this._curView === index}
              .disabled=${hidden}
              aria-label=${ifDefined(view.title)}
              class=${classMap({
                icon: Boolean(view.icon),
                "hide-tab": Boolean(hidden),
              })}
            >
              ${this._curView === index
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
              ${this._curView === index
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
                      .disabled=${(this._curView! as number) + 1 ===
                      views.length}
                    ></ha-icon-button-arrow-next>
                  `
                : nothing}
            </sl-tab>
          `;
        })}
      </sl-tab-group>`;
    }

    return html`
      <div class="bottom-navigation-overlay">
        <div class="bottom-navigation-mobile">
          <sl-tab-group @sl-tab-show=${this._handleViewSelected}>
            ${views.map((view, index) => {
              const hidden =
                !this.navigationConfig.editMode &&
                (view.subview || _isTabHiddenForUser(view));
              return html`
                <sl-tab
                  slot="nav"
                  panel=${index}
                  .active=${this._curView === index}
                  .disabled=${hidden}
                  aria-label=${ifDefined(view.title)}
                  class=${classMap({
                    icon: Boolean(view.icon),
                    "hide-tab": Boolean(hidden),
                  })}
                >
                  <div class="tab-content">
                    <ha-icon
                      class=${classMap({
                        "child-view-icon": Boolean(view.subview),
                      })}
                      title=${ifDefined(view.title)}
                      .icon=${view.icon || "mdi:help-box"}
                    ></ha-icon>
                    <span class="tab-title">
                      ${view.title ||
                      this.hass.localize(
                        "ui.panel.lovelace.views.unnamed_view"
                      )}
                    </span>
                  </div>
                </sl-tab>
              `;
            })}
          </sl-tab-group>
        </div>
      </div>
    `;
  }

  private _editView(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }

    showEditViewDialog(this, {
      lovelace: this.lovelace!,
      viewIndex: this._curView as number,
      saveCallback: (viewIndex: number, viewConfig: LovelaceViewConfig) => {
        const path = viewConfig.path || viewIndex;
        this._navigateToView(path);
      },
    });
  }

  private _moveViewLeft(ev: Event) {
    ev.stopPropagation();
    if (this._curView === 0) {
      return;
    }
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) - 1;
    this._curView = newIndex;
    if (!this.lovelaceConfig.views[oldIndex].path) {
      this._navigateToView(newIndex, true);
    }
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _moveViewRight(ev: Event) {
    ev.stopPropagation();
    if ((this._curView! as number) + 1 === this.lovelace!.config.views.length) {
      return;
    }
    const lovelace = this.lovelace!;
    const oldIndex = this._curView as number;
    const newIndex = (this._curView as number) + 1;
    this._curView = newIndex;
    if (!this.lovelaceConfig.views[oldIndex].path) {
      this._navigateToView(newIndex, true);
    }
    lovelace.saveConfig(swapView(lovelace.config, oldIndex, newIndex));
  }

  private _handleViewSelected(ev: {
    preventDefault: () => void;
    detail: { name: any };
  }) {
    ev.preventDefault();
    const viewIndex = Number(ev.detail.name);
    if (viewIndex !== this._curView) {
      const path = this.lovelaceConfig.views[viewIndex].path || viewIndex;
      this._navigateToView(path);
    } else if (!this.navigationConfig.editMode) {
      scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  private _navigateToView(path: string | number, replace?: boolean) {
    const url = this.lovelace!.editMode
      ? `${this.navigationConfig.route!.prefix}/${path}?${addSearchParam({ edit: "1" })}`
      : `${this.navigationConfig.route!.prefix}/${path}${location.search}`;

    const currentUrl = `${location.pathname}${location.search}`;
    if (currentUrl !== url) {
      navigate(url, { replace });
    }
  }

  private get lovelaceConfig(): LovelaceConfig {
    return this.lovelace!.config;
  }

  private _scrollToActiveTab(): void {
    setTimeout(() => {
      const tabGroup = this.shadowRoot?.querySelector("sl-tab-group");
      const activeTab = tabGroup?.querySelector("sl-tab[aria-selected='true']");

      if (activeTab && tabGroup) {
        const nav = tabGroup.shadowRoot?.querySelector(".tab-group__nav");
        if (nav) {
          activeTab.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    }, 100);
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

        :host([mode="desktop"]) sl-tab-group {
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

        :host([mode="desktop"]) sl-tab-group::part(nav) {
          padding: 0;
        }

        :host([mode="desktop"]) sl-tab-group::part(scroll-button) {
          background-color: var(--app-header-background-color);
          background: linear-gradient(
            90deg,
            var(--app-header-background-color),
            transparent
          );
          z-index: 1;
        }

        :host([mode="desktop"]) sl-tab-group::part(scroll-button--end) {
          background: linear-gradient(
            270deg,
            var(--app-header-background-color),
            transparent
          );
        }

        :host([mode="desktop"]) sl-tab {
          height: calc(var(--header-height) - 2px);
        }

        :host([mode="desktop"]) sl-tab::part(base) {
          padding-inline-start: var(
            --ha-tab-padding-start,
            var(--sl-spacing-large)
          );
          padding-inline-end: var(
            --ha-tab-padding-end,
            var(--sl-spacing-large)
          );
          padding-top: calc((var(--header-height) - 20px) / 2);
          padding-bottom: calc((var(--header-height) - 20px) / 2 - 2px);
          display: flex;
          align-items: center;
        }

        :host([mode="desktop"]) sl-tab.icon::part(base) {
          padding-top: calc((var(--header-height) - 20px) / 2 - 2px);
          padding-bottom: calc((var(--header-height) - 20px) / 2 - 4px);
        }

        :host([mode="desktop"]) sl-tab[aria-selected="true"] .edit-icon {
          display: inline-flex;
        }

        :host([mode="desktop"]) .edit-icon {
          color: var(--accent-color);
          padding: 0 8px;
          vertical-align: middle;
          --mdc-theme-text-disabled-on-light: var(--disabled-text-color);
          direction: var(--direction);
        }

        :host([mode="desktop"]) .edit-icon:last-child {
          padding-left: 0;
        }

        :host([mode="desktop"]) .edit-icon.view {
          display: none;
        }

        :host([mode="desktop"][edit-mode]) sl-tab-group {
          flex-grow: 0;
          color: var(--app-header-edit-text-color, #fff);
          --ha-tab-active-text-color: var(--app-header-edit-text-color, #fff);
          --ha-tab-indicator-color: var(--app-header-edit-text-color, #fff);
        }

        :host([mode="desktop"][edit-mode]) sl-tab-group::part(scroll-button) {
          background-color: var(--app-header-edit-background-color, #455a64);
          background: linear-gradient(
            90deg,
            var(--app-header-edit-background-color, #455a64),
            transparent
          );
        }

        :host([mode="desktop"][edit-mode])
          sl-tab-group::part(scroll-button--end) {
          background: linear-gradient(
            270deg,
            var(--app-header-edit-background-color, #455a64),
            transparent
          );
        }

        :host([mode="desktop"][edit-mode]) sl-tab {
          height: 54px;
        }

        :host([mode="desktop"][edit-mode]) sl-tab::part(base) {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 54px;
          box-sizing: border-box;
          min-height: unset;
        }

        :host([mode="desktop"][edit-mode])
          sl-tab[aria-selected="true"]::part(base) {
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 54px;
          box-sizing: border-box;
          min-height: unset;
        }

        :host([mode="desktop"][edit-mode]) .edit-icon {
          margin: 0 4px;
          flex-shrink: 0;
        }

        :host([mode="mobile"]) .bottom-navigation-overlay {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background-color: var(--app-header-background-color);
          color: var(--app-header-text-color, white);
          z-index: 4;
          padding-bottom: var(--safe-area-inset-bottom);
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host([mode="mobile"]) .bottom-navigation-mobile {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0px 16px;
          box-sizing: border-box;
        }

        :host([mode="mobile"]) sl-tab-group {
          --ha-tab-indicator-color: var(
            --app-header-selection-bar-color,
            var(--app-header-text-color, white)
          );
          --ha-tab-active-text-color: var(--app-header-text-color, white);
          --ha-tab-track-color: transparent;
          --indicator-placement: top;
          width: 100%;
          height: 100%;
          max-width: 600px;
        }

        :host([mode="mobile"]) sl-tab-group::part(nav) {
          padding: 0;
          height: 100%;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        :host([mode="mobile"]) sl-tab::part(base) {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0px 12px;
          margin: 0;
          border-radius: 8px;
          transition: background-color 0.2s ease;
        }

        :host([mode="mobile"]) sl-tab {
          height: 100%;
          min-height: 54px;
          flex: 1 1 0;
          min-width: 60px;
          max-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host([mode="mobile"]) .tab-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          width: 100%;
          height: 100%;
          padding: 0;
          box-sizing: border-box;
          gap: 4px;
        }

        :host([mode="mobile"]) .tab-title {
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          line-height: 1.2;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          opacity: 0.9;
        }

        :host([mode="mobile"]) sl-tab[aria-selected="true"] .tab-title {
          padding-top: 5px;
          opacity: 1;
          font-weight: 600;
        }

        :host([mode="mobile"]) ha-icon {
          font-size: 28px;
          width: 26px;
          height: 28px;
          margin-bottom: 2px;
          transition: transform 0.2s ease;
        }

        :host([mode="mobile"]) sl-tab[aria-selected="true"] ha-icon {
          transform: scale(1.1);
        }

        /* Estilos comunes */
        .hide-tab {
          display: none;
        }

        .child-view-icon {
          opacity: 0.5;
        }

        @media (min-width: 600px) {
          :host([mode="mobile"]) {
            display: none;
          }
        }

        :host([mode="mobile"][edit-mode]) sl-tab-group {
          --ha-tab-indicator-color: var(--app-header-edit-text-color, #fff);
          --ha-tab-active-text-color: var(--app-header-edit-text-color, #fff);
          --ha-tab-track-color: transparent;
          flex-grow: 1;
          height: 56px;
          overflow: hidden;
        }

        :host([mode="mobile"][edit-mode]) sl-tab-group::part(nav) {
          padding: 0;
          height: 56px;
          display: flex;
          gap: 4px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        :host([mode="mobile"][edit-mode])
          sl-tab-group::part(nav)::-webkit-scrollbar {
          display: none;
        }

        :host([mode="mobile"][edit-mode]) sl-tab {
          height: 56px;
          min-width: 140px;
          flex: 0 0 auto;
          max-width: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        :host([mode="mobile"][edit-mode]) sl-tab::part(base) {
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 56px;
          min-height: 56px;
          overflow: visible;
          white-space: nowrap;
          gap: 6px;
          min-width: 140px;
          max-width: 260px;
          flex-wrap: nowrap;
          box-sizing: border-box;
        }

        :host([mode="mobile"][edit-mode]) .edit-icon {
          color: var(--accent-color);
          margin: 0;
          padding: 0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          --mdc-icon-button-size: 40px;
          --mdc-icon-size: 20px;
        }

        :host([mode="mobile"][edit-mode]) sl-tab ha-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin: 0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host([mode="mobile"][edit-mode]) sl-tab {
          text-overflow: ellipsis;
          overflow: visible;
          white-space: nowrap;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host([mode="mobile"][edit-mode]) sl-tab:not([aria-selected="true"]) {
          max-width: 120px;
          min-width: 80px;
        }

        :host([mode="mobile"][edit-mode]) sl-tab[aria-selected="true"] {
          min-width: 200px;
          max-width: 260px;
        }

        :host([mode="mobile"][edit-mode])
          sl-tab:not([aria-selected="true"])::part(base) {
          min-width: 80px;
          max-width: 120px;
          justify-content: center;
          align-items: center;
          padding: 8px 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          height: 56px;
          min-height: 56px;
          display: flex;
        }

        :host([mode="mobile"][edit-mode]) .edit-icon.view {
          display: none;
        }

        :host([mode="mobile"][edit-mode])
          sl-tab[aria-selected="true"]
          .edit-icon.view {
          display: inline-flex;
        }

        :host([mode="mobile"][edit-mode]) sl-tab-group::part(nav) {
          transform: translateZ(0);
          will-change: scroll-position;
        }

        :host([mode="mobile"][edit-mode]) sl-tab {
          line-height: 1;
        }

        :host([mode="mobile"][edit-mode])
          sl-tab::part(base)
          *:not(.edit-icon):not(ha-icon) {
          line-height: 1.2;
          display: flex;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lovelace-navigation": HuiLovelaceNavigation;
  }
}
