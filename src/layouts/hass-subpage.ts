import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, eventOptions, property } from "lit/decorators";
import { restoreScroll } from "../common/decorators/restore-scroll";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import { computeRTL } from "../common/util/compute_rtl";
import "../components/ha-icon-button-arrow-prev";
import "../components/ha-menu-button";
import { HomeAssistant } from "../types";
import { haStyleScrollbar } from "../resources/styles";

@customElement("hass-subpage")
class HassSubpage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public header?: string;

  @property({ type: Boolean, attribute: "main-page" }) public mainPage = false;

  @property({ type: String, attribute: "back-path" }) public backPath?: string;

  @property() public backCallback?: () => void;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public supervisor = false;

  // @ts-ignore
  @restoreScroll(".content") private _savedScrollPos?: number;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.locale !== this.hass.locale) {
      toggleAttribute(this, "rtl", computeRTL(this.hass));
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="toolbar">
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

        <div class="main-title"><slot name="header">${this.header}</slot></div>
        <slot name="toolbar-icon"></slot>
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
          display: flex;
          align-items: center;
          font-size: 20px;
          height: var(--header-height);
          padding: 8px 12px;
          pointer-events: none;
          background-color: var(--app-header-background-color);
          font-weight: 400;
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 4px;
          }
        }
        .toolbar a {
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
          margin: 0 0 0 24px;
          line-height: 20px;
          flex-grow: 1;
        }

        .content {
          position: relative;
          width: 100%;
          height: calc(100% - 1px - var(--header-height));
          overflow-y: auto;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }

        #fab {
          position: absolute;
          right: calc(16px + env(safe-area-inset-right));
          bottom: calc(16px + env(safe-area-inset-bottom));
          z-index: 1;
        }
        :host([narrow]) #fab.tabs {
          bottom: calc(84px + env(safe-area-inset-bottom));
        }
        #fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        :host([rtl]) #fab {
          right: auto;
          left: calc(16px + env(safe-area-inset-left));
        }
        :host([rtl][is-wide]) #fab {
          bottom: 24px;
          left: 24px;
          right: auto;
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
