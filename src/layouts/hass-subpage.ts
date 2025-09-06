import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, eventOptions, property } from "lit/decorators";
import { restoreScroll } from "../common/decorators/restore-scroll";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import type { HomeAssistant } from "../types";
import { haStyleScrollbar } from "../resources/styles";

@customElement("hass-subpage")
class HassSubpage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public header?: string;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

  @property({ type: String, attribute: "back-path" }) public backPath?: string;

  @property({ attribute: false }) public backCallback?: () => void;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public supervisor = false;

  // @ts-ignore
  @restoreScroll(".content") private _savedScrollPos?: number;

  protected render(): TemplateResult {
    return html`
      <div class="toolbar">
        <div class="toolbar-content">
          ${this.mainPage || history.state?.root
            ? html`
                <ha-menu-button
                  .hassio=${this.supervisor}
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                ></ha-menu-button>
              `
            : this.backPath
              ? html`
                  <a href=${this.backPath}>
                    <ha-icon-button-arrow-prev
                      .hass=${this.hass}
                    ></ha-icon-button-arrow-prev>
                  </a>
                `
              : html`
                  <ha-icon-button-arrow-prev
                    .hass=${this.hass}
                    @click=${this._backTapped}
                  ></ha-icon-button-arrow-prev>
                `}

          <div class="main-title">
            <slot name="header">${this.header}</slot>
          </div>
          <slot name="toolbar-icon"></slot>
        </div>
      </div>
      <div class="content ha-scrollbar" @scroll=${this._saveScrollPos}>
        <slot></slot>
      </div>
      <div id="fab">
        <slot name="fab"></slot>
      </div>
    `;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  private _backTapped(): void {
    if (this.backCallback) {
      this.backCallback();
      return;
    }
    history.back();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: block;
          height: 100%;
          background-color: var(--primary-background-color);
          overflow: hidden;
          position: relative;
        }

        :host([narrow]) {
          width: 100%;
          position: fixed;
        }

        .toolbar {
          padding-top: var(--safe-area-inset-top);
          padding-right: var(--safe-area-inset-right);
          padding-left: var(--safe-area-inset-left);
          background-color: var(--app-header-background-color);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
        }

        .toolbar-content {
          display: flex;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 8px 12px;
          font-weight: var(--ha-font-weight-normal);
          color: var(--app-header-text-color, white);
        }
        @media (max-width: 599px) {
          .toolbar-content {
            padding: 4px;
          }
        }
        .toolbar-content a {
          color: var(--sidebar-text-color);
          text-decoration: none;
        }

        ha-menu-button,
        ha-icon-button-arrow-prev,
        ::slotted([slot="toolbar-icon"]) {
          pointer-events: auto;
          color: var(--sidebar-icon-color);
        }

        .main-title {
          margin: var(--margin-title);
          line-height: var(--ha-line-height-normal);
          min-width: 0;
          flex-grow: 1;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-bottom: 1px;
        }

        .content {
          position: relative;
          width: 100%;
          height: calc(
            100% - 1px - var(--header-height) - var(--safe-area-inset-top, 0px)
          );
          overflow-y: auto;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        #fab {
          position: absolute;
          right: calc(16px + var(--safe-area-inset-right));
          inset-inline-end: calc(16px + var(--safe-area-inset-right));
          inset-inline-start: initial;
          bottom: calc(16px + var(--safe-area-inset-bottom));
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }
        :host([narrow]) #fab.tabs {
          bottom: calc(84px + var(--safe-area-inset-bottom));
        }
        #fab[is-wide] {
          bottom: 24px;
          right: 24px;
          inset-inline-end: 24px;
          inset-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-subpage": HassSubpage;
  }
}
