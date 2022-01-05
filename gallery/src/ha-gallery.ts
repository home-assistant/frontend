import { mdiMenu } from "@mdi/js";
import "@material/mwc-drawer";
import "@material/mwc-top-app-bar-fixed";
import { html, css, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
// eslint-disable-next-line import/extensions
import { DEMOS } from "../build/import-demos";
import { dynamicElement } from "../../src/common/dom/dynamic-element-directive";

const DEMOS_GROUPED: {
  header?: string;
  demos?: string[];
  demoStart?: string;
}[] = [
  {
    demos: ["demo-introduction"],
  },
  {
    header: "Lovelace",
    demoStart: "hui-",
  },
  {
    header: "Automation",
    demoStart: "automation-",
  },
  {
    header: "Rest",
    demoStart: "",
  },
];

const demosToProcess = new Set(Object.keys(DEMOS));

for (const group of Object.values(DEMOS_GROUPED)) {
  if (group.demos) {
    for (const demo of group.demos) {
      demosToProcess.delete(demo);
    }
  }
  if (!group.demos) {
    group.demos = [];
  }
  if (group.demoStart !== undefined) {
    for (const demo of demosToProcess) {
      if (demo.startsWith(`demo-${group.demoStart}`)) {
        group.demos.push(demo);
        demosToProcess.delete(demo);
      }
    }
  }
}

const FAKE_HASS = {
  // Just enough for computeRTL for notification-manager
  language: "en",
  translationMetadata: {
    translations: {},
  },
};

@customElement("ha-gallery")
class HaGallery extends LitElement {
  @property() private _demo =
    document.location.hash.substring(1) || "demo-introduction";

  @query("notification-manager")
  private _notifications!: HTMLElementTagNameMap["notification-manager"];

  @query("mwc-drawer")
  private _drawer!: HTMLElementTagNameMap["mwc-drawer"];

  render() {
    return html`
      <mwc-drawer open hasHeader type="dismissible">
        <span slot="title">Home Assistant Design</span>
        <!-- <span slot="subtitle">subtitle</span> -->
        <div class="sidebar">
          ${DEMOS_GROUPED.map(
            (group) => html`
              ${group.header
                ? html`<p class="section">${group.header}</p>`
                : ""}
              ${group.demos!.map((demo) => this._renderDemo(demo))}
            `
          )}
        </div>
        <div slot="appContent">
          <mwc-top-app-bar-fixed>
            <ha-icon-button
              slot="navigationIcon"
              @click=${this._menuTapped}
              .path=${mdiMenu}
            ></ha-icon-button>

            <div slot="title">${this._demo.substring(5)}</div>
          </mwc-top-app-bar-fixed>
          <div>${dynamicElement(this._demo)}</div>
        </div>
      </mwc-drawer>
      <notification-manager
        .hass=${FAKE_HASS}
        id="notifications"
      ></notification-manager>
    `;
  }

  private _renderDemo(demo: string) {
    return html`
      <a ?active=${this._demo === demo} href=${`#${demo}`}
        >${demo.startsWith("demo-hui-")
          ? demo.substring(9)
          : demo.substring(5)}</a
      >
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
    });
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_demo") && this._demo) {
      DEMOS[this._demo]();
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

      .section {
        font-weight: bold;
      }

      .sidebar {
        padding: 4px;
      }

      .sidebar p {
        margin: 1em 12px;
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gallery": HaGallery;
  }
}
