import "./ha-sidebar-header";
import "./ha-sidebar-panel-list";
import "./ha-clickable-list-item";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-list";
import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import { mdiBell, mdiMenu, mdiMenuOpen } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  eventOptions,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeRTL } from "../common/util/compute_rtl";
import { ActionHandlerDetail } from "../data/lovelace";
import {
  PersistentNotification,
  subscribeNotifications,
} from "../data/persistent_notification";
import { getExternalConfig } from "../external_app/external_config";
import { actionHandler } from "../panels/lovelace/common/directives/action-handler-directive";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-icon";
import "./ha-menu-button";
import "./ha-svg-icon";
import "./user/ha-user-badge";
import { sidebarStyles } from "./ha-sidebar";

const SUPPORT_SCROLL_IF_NEEDED = "scrollIntoViewIfNeeded" in document.body;

let Sortable;

@customElement("ha-sidebar-overhaul")
class HaSidebarOverhaul extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public alwaysExpand = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @property({ type: Boolean }) public editMode = false;

  @internalProperty() private _notifications?: PersistentNotification[];

  // property used only in css
  // @ts-ignore
  @property({ type: Boolean, reflect: true }) public rtl = false;

  private _sortable?;

  protected render() {
    const hass = this.hass;
    if (!this.hass) {
      return html``;
    }

    // prettier-ignore
    return html` ${this._renderHeader()}
      <div class="all-panels">
        <div class="panels">
          <mwc-list>
            <mwc-list-item>Panel 1</mwc-list-item>
            <mwc-list-item>Panel 2</mwc-list-item>
            <mwc-list-item>Panel 3</mwc-list-item>
            <mwc-list-item noninteractive class="divider">Divider</mwc-list-item>
            <mwc-list-item >Utility</mwc-list-item>
          </mwc-list>
        </div>
      </div>
      <div class="user-stuff">User stuff</div>
      <div id="sortable"><span data-panel="1"></span></div>`;
  }

  private _renderHeader() {
    return html`<div
      class="menu"
      @action=${this._handleAction}
      .actionHandler=${actionHandler({
        hasHold: !this.editMode,
        disabled: this.editMode,
      })}
    >
      ${!this.narrow
        ? html`
            <mwc-icon-button
              .label=${this.hass.localize("ui.sidebar.sidebar_toggle")}
              @action=${this._toggleSidebar}
            >
              <ha-svg-icon
                .path=${this.hass.dockedSidebar === "docked"
                  ? mdiMenuOpen
                  : mdiMenu}
              ></ha-svg-icon>
            </mwc-icon-button>
          `
        : ""}
      <div class="title">
        ${this.editMode
          ? html`<mwc-button outlined @click=${this._closeEditMode}>
              ${this.hass.localize("ui.sidebar.done")}
            </mwc-button>`
          : "Home Assistant"}
      </div>
    </div>`;
  }

  private _editDoneButton() {
    return html`<mwc-button outlined @click=${() => this._closeEditMode()}>
      ${this.hass.localize("ui.sidebar.done")}
    </mwc-button>`;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("alwaysExpand")) {
      this.expanded = this.alwaysExpand;
    }

    if (changedProps.has("editMode")) {
      if (this.editMode) {
        this._activateEditMode();
      } else {
        this._deactivateEditMode();
      }
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.language !== this.hass.language) {
      this.rtl = computeRTL(this.hass);
    }

    if (!SUPPORT_SCROLL_IF_NEEDED) {
      return;
    }
    // if (!oldHass || oldHass.panelUrl !== this.hass.panelUrl) {
    //   const selectedEl = this.shadowRoot!.querySelector(".iron-selected");
    //   if (selectedEl) {
    //     // @ts-ignore
    //     selectedEl.scrollIntoViewIfNeeded();
    //   }
    // }
  }

  private async _activateEditMode() {
    if (!Sortable) {
      const [sortableImport, sortStylesImport] = await Promise.all([
        import("sortablejs/modular/sortable.core.esm"),
        import("../resources/ha-sortable-style-ha-clickable"),
      ]);

      const style = document.createElement("style");
      style.innerHTML = sortStylesImport.sortableStyles.cssText;
      this.shadowRoot!.appendChild(style);

      Sortable = sortableImport.Sortable;
      Sortable.mount(sortableImport.OnSpill);
      Sortable.mount(sortableImport.AutoScroll());
    }

    await this.updateComplete;

    this._createSortable();
  }

  private _createSortable() {
    this._sortable = new Sortable(this.shadowRoot!.getElementById("sortable"), {
      animation: 150,
      fallbackClass: "sortable-fallback",
      // fallbackTolerance: 15,
      dataIdAttr: "data-panel",
      handle: "span",
      onSort: async () => {},
    });
  }

  private _deactivateEditMode() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _handleAction(ev: CustomEvent<ActionHandlerDetail>) {
    if (ev.detail.action !== "hold") {
      return;
    }

    fireEvent(this, "hass-edit-sidebar", { editMode: true });
  }

  private _closeEditMode() {
    fireEvent(this, "hass-edit-sidebar", { editMode: false });
  }

  private _toggleSidebar(ev: CustomEvent) {
    if (ev.detail.action !== "tap") {
      return;
    }
    fireEvent(this, "hass-toggle-menu");
  }

  static get styles(): CSSResult[] {
    return [
      haStyleScrollbar,
      css`
        :host {
          /* height: calc(100% - var(--header-height)); */
          height: 100%;
          display: block;
          overflow: hidden;
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          border-right: 1px solid var(--divider-color);
          background-color: var(--sidebar-background-color);
          width: 64px;
        }
        :host([expanded]) {
          width: 256px;
          width: calc(256px + env(safe-area-inset-left));
        }
        :host([rtl]) {
          border-right: 0;
          border-left: 1px solid var(--divider-color);
        }
        .menu {
          height: var(--header-height);
          display: flex;
          padding: 0 8.5px;
          border-bottom: 1px solid transparent;
          white-space: nowrap;
          font-weight: 400;
          color: var(--primary-text-color);
          border-bottom: 1px solid var(--divider-color);
          background-color: var(--primary-background-color);
          font-size: 20px;
          align-items: center;
          padding-left: calc(8.5px + env(safe-area-inset-left));
        }

        :host([rtl]) .menu {
          padding-left: 8.5px;
          padding-right: calc(8.5px + env(safe-area-inset-right));
        }
        :host([expanded]) .menu {
          width: calc(256px + env(safe-area-inset-left));
        }
        :host([rtl][expanded]) .menu {
          width: calc(256px + env(safe-area-inset-right));
        }
        .menu mwc-icon-button {
          color: var(--sidebar-icon-color);
        }
        :host([expanded]) .menu mwc-icon-button {
          margin-right: 23px;
        }
        :host([expanded][rtl]) .menu mwc-icon-button {
          margin-right: 0px;
          margin-left: 23px;
        }

        .title {
          width: 100%;
          display: none;
        }
        :host([narrow]) .title {
          padding: 0 0px;
        }
        :host([expanded]) .title {
          display: initial;
        }
        .title mwc-button {
          width: 100%;
        }

        #sortable,
        .hidden-panel {
          display: none;
        }

        .all-panels {
          border: 2px solid black;
          height: calc(100% - var(--header-height) - 132px);
          position: relative;
        }
        .panels {
          border: 1px solid blue;
          /* height: calc(100% - var(--header-height)); */
        }

        .divider {
          border: 1px solid pink;
          /* height: calc(100% - var(--header-height)); */
        }
        .utilities {
          border: 1px solid red;
          position: absolute;
          bottom: 0px;
          width: 100%;
        }
        .user-stuff {
          border: 1px solid green;
        }
      `,
    ];
  }

  // static get styles(): CSSResult[] {
  //   return [haStyleScrollbar, sidebarStyles];
  // }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sidebar-overhaul": HaSidebarOverhaul;
  }
}
