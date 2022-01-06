import { mdiMenu } from "@mdi/js";
import "@material/mwc-drawer";
import "@material/mwc-top-app-bar-fixed";
import { html, css, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../src/components/ha-card";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import { DEMOS, SIDEBAR } from "../build/import-demos";
import { dynamicElement } from "../../src/common/dom/dynamic-element-directive";
import "./components/demo-description";

const GITHUB_DEMO_URL =
  "https://github.com/home-assistant/frontend/blob/dev/gallery/src/demos/";

const FAKE_HASS = {
  // Just enough for computeRTL for notification-manager
  language: "en",
  translationMetadata: {
    translations: {},
  },
};

console.log(SIDEBAR);

@customElement("ha-gallery")
class HaGallery extends LitElement {
  @property() private _demo =
    document.location.hash.substring(1) ||
    `${SIDEBAR[0].category}/${SIDEBAR[0].demos![0]}`;

  @query("notification-manager")
  private _notifications!: HTMLElementTagNameMap["notification-manager"];

  @query("mwc-drawer")
  private _drawer!: HTMLElementTagNameMap["mwc-drawer"];

  private _narrow = window.matchMedia("(max-width: 600px)").matches;

  render() {
    const sidebar: unknown[] = [];

    for (const group of SIDEBAR) {
      const links: unknown[] = [];

      for (const demo of group.demos!) {
        const key = `${group.category}/${demo}`;
        const active = this._demo === key;
        const title = DEMOS[key].metadata.title || demo;
        links.push(html`
          <a ?active=${active} href=${`#${group.category}/${demo}`}>${title}</a>
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
              ${DEMOS[this._demo].metadata.title || this._demo.split("/")[1]}
            </div>
          </mwc-top-app-bar-fixed>
          <div>
            <demo-description .demo=${this._demo}></demo-description>
            ${dynamicElement(`demo-${this._demo.replace("/", "-")}`)}
            <div class="demo-footer">
              ${DEMOS[this._demo].description
                ? html`
                    <a
                      href=${`${GITHUB_DEMO_URL}${this._demo}.markdown`}
                      target="_blank"
                    >
                      Edit text
                    </a>
                  `
                : ""}
              ${DEMOS[this._demo].load
                ? html`
                    <a
                      href=${`${GITHUB_DEMO_URL}${this._demo}.ts`}
                      target="_blank"
                    >
                      Edit demo
                    </a>
                  `
                : ""}
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

    document.location.hash = this._demo;

    window.addEventListener("hashchange", () => {
      this._demo = document.location.hash.substring(1);
      if (this._narrow) {
        this._drawer.open = false;
      }
    });
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_demo") && DEMOS[this._demo].load) {
      DEMOS[this._demo].load();
      const menuItem = this.shadowRoot!.querySelector(
        `a[href="#${this._demo}"]`
      )!;
      // Make sure section is expanded
      (menuItem.parentElement as any).open = true;
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

      .demo-footer {
        text-align: center;
        margin: 16px 0;
      }

      .demo-footer a {
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
