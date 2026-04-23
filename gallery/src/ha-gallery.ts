import "@material/mwc-drawer";
import "@material/mwc-top-app-bar-fixed";
import { mdiMenu, mdiSwapHorizontal } from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators";
import { dynamicElement } from "../../src/common/dom/dynamic-element-directive";
import { setDirectionStyles } from "../../src/common/util/compute_rtl";
import "../../src/components/ha-button";
import { HaExpansionPanel } from "../../src/components/ha-expansion-panel";
import "../../src/components/ha-icon-button";
import "../../src/components/ha-svg-icon";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import { PAGES, SIDEBAR } from "../build/import-pages";
import "./components/page-description";

const RTL_STORAGE_KEY = "gallery-rtl";

const GITHUB_DEMO_URL =
  "https://github.com/home-assistant/frontend/blob/dev/gallery/src/pages/";

const FAKE_HASS = {
  // Just enough for computeRTL for notification-manager
  language: "en",
  translationMetadata: {
    translations: {},
  },
};

@customElement("ha-gallery")
class HaGallery extends LitElement {
  @state() private _page =
    document.location.hash.substring(1) ||
    `${SIDEBAR[0].category}/${SIDEBAR[0].pages![0]}`;

  @state() private _rtl = localStorage.getItem(RTL_STORAGE_KEY) === "true";

  @query("notification-manager")
  private _notifications!: HTMLElementTagNameMap["notification-manager"];

  @query("mwc-drawer")
  private _drawer!: HTMLElementTagNameMap["mwc-drawer"];

  private _narrow = window.matchMedia("(max-width: 600px)").matches;

  render() {
    const sidebar: unknown[] = [];

    for (const group of SIDEBAR) {
      const links: unknown[] = [];

      for (const page of group.pages!) {
        const key = `${group.category}/${page}`;
        const active = this._page === key;
        if (!(key in PAGES)) {
          console.error("Undefined page referenced in sidebar.js:", key);
          continue;
        }
        const title = PAGES[key].metadata.title || page;
        links.push(html`
          <a ?active=${active} href=${`#${group.category}/${page}`}>${title}</a>
        `);
      }

      sidebar.push(
        group.header
          ? html`
              <ha-expansion-panel .header=${group.header}>
                ${links}
              </ha-expansion-panel>
            `
          : links
      );
    }

    return html`
      <mwc-drawer
        hasHeader
        .open=${!this._narrow}
        .type=${this._narrow ? "modal" : "dismissible"}
      >
        <span slot="title">Home Assistant Design</span>
        <!-- <span slot="subtitle">subtitle</span> -->
        <div class="sidebar">${sidebar}</div>
        <div slot="appContent">
          <mwc-top-app-bar-fixed>
            <ha-icon-button
              slot="navigationIcon"
              @click=${this._menuTapped}
              .path=${mdiMenu}
            ></ha-icon-button>

            <div slot="title">
              ${PAGES[this._page].metadata.title || this._page.split("/")[1]}
            </div>
          </mwc-top-app-bar-fixed>
          <div class="content">
            ${PAGES[this._page].description
              ? html`
                  <page-description .page=${this._page}></page-description>
                `
              : ""}
            ${dynamicElement(`demo-${this._page.replace("/", "-")}`)}
          </div>
          <div class="page-footer">
            <div class="edit-docs">
              <div class="header">Help us to improve our documentation</div>
              <div class="secondary">
                Suggest an edit to this page, or provide/view feedback for this
                page.
              </div>
              <div>
                ${PAGES[this._page].description ||
                Object.keys(PAGES[this._page].metadata).length > 0
                  ? html`
                      <a
                        href=${`${GITHUB_DEMO_URL}${this._page}.markdown`}
                        target="_blank"
                      >
                        Edit text
                      </a>
                    `
                  : ""}
                ${PAGES[this._page].demo
                  ? html`
                      <a
                        href=${`${GITHUB_DEMO_URL}${this._page}.ts`}
                        target="_blank"
                      >
                        Edit demo
                      </a>
                    `
                  : ""}
              </div>
            </div>
            <div class="rtl-toggle">
              <ha-icon-button
                @click=${this._toggleRtl}
                .label=${this._rtl ? "Switch to LTR" : "Switch to RTL"}
              >
                <ha-svg-icon .path=${mdiSwapHorizontal}></ha-svg-icon>
              </ha-icon-button>
            </div>
          </div>
        </div>
      </mwc-drawer>
      <notification-manager
        .hass=${FAKE_HASS}
        id="notifications"
      ></notification-manager>
    `;
  }

  firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._applyDirection();

    this.addEventListener("show-notification", (ev) =>
      this._notifications.showDialog({ message: ev.detail.message })
    );
    this.addEventListener("alert-dismissed-clicked", () =>
      this._notifications.showDialog({ message: "Alert dismissed clicked" })
    );
    this.addEventListener("hass-more-info", (ev) => {
      if (ev.detail.entityId) {
        this._notifications.showDialog({
          message: `Showing more info for ${ev.detail.entityId}`,
        });
      }
    });

    document.location.hash = this._page;

    window.addEventListener("hashchange", () => {
      this._page = document.location.hash.substring(1);
      if (this._narrow) {
        this._drawer.open = false;
      }
    });
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("_rtl")) {
      this._applyDirection();
    }

    if (!changedProps.has("_page")) {
      return;
    }

    if (PAGES[this._page].demo) {
      PAGES[this._page].demo();
    }

    const menuItem = this.shadowRoot!.querySelector(
      `a[href="#${this._page}"]`
    )!;

    // Make sure section is expanded
    if (menuItem.parentElement instanceof HaExpansionPanel) {
      menuItem.parentElement.expanded = true;
    }
  }

  private _menuTapped() {
    this._drawer.open = !this._drawer.open;
  }

  private _toggleRtl() {
    this._rtl = !this._rtl;
    localStorage.setItem(RTL_STORAGE_KEY, String(this._rtl));
  }

  private _applyDirection() {
    setDirectionStyles(this._rtl ? "rtl" : "ltr", this);
  }

  static styles = [
    haStyle,
    css`
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }

      .sidebar {
        padding: 4px;
      }

      .sidebar a {
        color: var(--primary-text-color);
        display: block;
        padding: 12px;
        text-decoration: none;
        position: relative;
      }

      .sidebar a[active]::before {
        border-radius: var(--ha-border-radius-lg);
        position: absolute;
        top: 0;
        right: 2px;
        bottom: 0;
        left: 2px;
        pointer-events: none;
        content: "";
        transition: opacity 15ms linear;
        will-change: opacity;
        background-color: var(--sidebar-selected-icon-color);
        opacity: 0.12;
      }

      div[slot="appContent"] {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--primary-background-color);
      }

      .content {
        flex: 1;
      }

      page-description {
        margin: 16px;
      }

      .page-footer {
        display: flex;
        border-radius: var(--ha-border-radius-lg);
        background-color: var(--primary-background-color);
      }

      .edit-docs {
        flex: 1;
        text-align: center;
        margin: 16px;
        padding: 16px;
      }

      .page-footer div {
        margin-top: 4px;
      }

      .page-footer .header {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
        text-align: center;
      }

      .page-footer .secondary {
        line-height: var(--ha-line-height-normal);
        text-align: center;
      }

      .page-footer a {
        display: inline-block;
        margin: 0 8px;
        text-decoration: none;
      }

      .rtl-toggle {
        padding: var(--ha-space-4);
        display: inline-flex;
        align-items: flex-end;
        margin-top: 12px !important;
      }

      .rtl-toggle ha-icon-button {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-pill);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gallery": HaGallery;
  }
}
