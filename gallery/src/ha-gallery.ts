import { mdiMenu } from "@mdi/js";
import "@material/mwc-drawer";
import "@material/mwc-top-app-bar-fixed";
import { html, css, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import { PAGES, SIDEBAR } from "../build/import-pages";
import { dynamicElement } from "../../src/common/dom/dynamic-element-directive";
import "./components/page-description";

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
  @property() private _page =
    document.location.hash.substring(1) ||
    `${SIDEBAR[0].category}/${SIDEBAR[0].pages![0]}`;

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
        const title = PAGES[key].metadata.title || page;
        links.push(html`
          <a ?active=${active} href=${`#${group.category}/${page}`}>${title}</a>
        `);
      }

      sidebar.push(
        group.header
          ? html`
              <details>
                <summary class="section">${group.header}</summary>
                ${links}
              </details>
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
      </mwc-drawer>
      <notification-manager
        .hass=${FAKE_HASS}
        id="notifications"
      ></notification-manager>
    `;
  }

  firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

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
    if (menuItem.parentElement instanceof HTMLDetailsElement) {
      menuItem.parentElement.open = true;
    }
  }

  _menuTapped() {
    this._drawer.open = !this._drawer.open;
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

      .sidebar details {
        margin-top: 1em;
        margin-left: 1em;
      }

      .sidebar summary {
        cursor: pointer;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .sidebar a {
        color: var(--primary-text-color);
        display: block;
        padding: 4px 12px;
        text-decoration: none;
        position: relative;
      }

      .sidebar a[active]::before {
        border-radius: 4px;
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
        text-align: center;
        margin: 16px 0;
        padding-top: 16px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
      }

      .page-footer a {
        display: inline-block;
        margin: 0 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gallery": HaGallery;
  }
}
