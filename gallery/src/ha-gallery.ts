import { mdiArrowLeft, mdiChevronRight } from "@mdi/js";
import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { html, css, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../src/components/ha-card";
import "../../src/components/ha-svg-icon";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import { haStyle } from "../../src/resources/styles";
import "../../src/styles/polymer-ha-style";
// eslint-disable-next-line import/extensions
import { DEMOS } from "../build/import-demos";
import { dynamicElement } from "../../src/common/dom/dynamic-element-directive";

const DEMOS_GROUPED = {
  lovelace: [] as string[],
  rest: [] as string[],
};

for (const key of Object.keys(DEMOS)) {
  if (key.startsWith("demo-hui")) {
    DEMOS_GROUPED.lovelace.push(key);
  } else {
    DEMOS_GROUPED.rest.push(key);
  }
}

const FAKE_HASS = {
  // Just enough for computeRTL
  language: "en",
  translationMetadata: {
    translations: {},
  },
};

@customElement("ha-gallery")
class HaGallery extends LitElement {
  @property() private _demo = document.location.hash.substring(1);

  @query("notification-manager")
  private _notifications!: HTMLElementTagNameMap["notification-manager"];

  render() {
    return html`
      <app-header-layout>
        <app-header slot="header" fixed>
          <app-toolbar>
            ${this._demo
              ? html`
                  <ha-icon-button
                    @click=${this._backTapped}
                    .path=${mdiArrowLeft}
                  ></ha-icon-button>
                `
              : ""}
            <div main-title>${this._demo || "Home Assistant Gallery"}</div>
          </app-toolbar>
        </app-header>

        <div class="content">
          ${this._demo
            ? html`${dynamicElement(this._demo)}`
            : html`
                <div class="pickers">
                  <ha-card header="Lovelace Card Demos">
                    <div class="card-content intro">
                      <p>
                        Lovelace has many different cards. Each card allows the
                        user to tell a different story about what is going on in
                        their house. These cards are very customizable, as no
                        household is the same.
                      </p>

                      <p>
                        This gallery helps our developers and designers to see
                        all the different states that each card can be in.
                      </p>

                      <p>
                        Check
                        <a href="https://www.home-assistant.io/lovelace"
                          >the official website</a
                        >
                        for instructions on how to get started with Lovelace.
                      </p>
                    </div>
                    ${DEMOS_GROUPED.lovelace.map(
                      (demo) => html`
                        <a href=${`#${demo}`}>
                          <paper-item>
                            <paper-item-body
                              >${demo.substring(9)}</paper-item-body
                            >
                            <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
                          </paper-item>
                        </a>
                      `
                    )}
                  </ha-card>

                  <ha-card header="Other Demos">
                    <div class="card-content intro"></div>
                    ${DEMOS_GROUPED.rest.map(
                      (demo) => html`
                        <a href=${`#${demo}`}>
                          <paper-item>
                            <paper-item-body
                              >${demo.substring(5)}</paper-item-body
                            >
                            <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
                          </paper-item>
                        </a>
                      `
                    )}
                  </ha-card>
                </div>
              `}
        </div>
      </app-header-layout>
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

  _backTapped() {
    document.location.hash = "";
  }

  static styles = [
    haStyle,
    css`
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }
      app-header-layout {
        min-height: 100vh;
      }
      ha-icon-button.invisible {
        visibility: hidden;
      }

      .pickers {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: start;
      }

      .pickers ha-card {
        width: 400px;
        display: block;
        margin: 16px 8px;
      }

      .pickers ha-card:last-child {
        margin-bottom: 16px;
      }

      .intro {
        margin: -1em 0;
      }

      p a {
        color: var(--primary-color);
      }

      a {
        color: var(--primary-text-color);
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-gallery": HaGallery;
  }
}
