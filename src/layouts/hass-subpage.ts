import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  eventOptions,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import "../components/ha-menu-button";
import "../components/ha-icon-button-arrow-prev";
import { restoreScroll } from "../common/decorators/restore-scroll";

@customElement("hass-subpage")
class HassSubpage extends LitElement {
  @property()
  public header?: string;

  @property({ type: Boolean })
  public showBackButton = true;

  @property({ type: Boolean })
  public hassio = false;

  // @ts-ignore
  @restoreScroll(".content") private _savedScrollPos?: number;

  protected render(): TemplateResult {
    return html`
      <div class="toolbar">
        <ha-icon-button-arrow-prev
          aria-label="Back"
          @click=${this._backTapped}
          class=${classMap({ hidden: !this.showBackButton })}
        ></ha-icon-button-arrow-prev>

        <div class="main-title">${this.header}</div>
        <slot name="toolbar-icon"></slot>
      </div>
      <div class="content" @scroll=${this._saveScrollPos}><slot></slot></div>
    `;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  private _backTapped(): void {
    history.back();
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 100%;
        background-color: var(--primary-background-color);
      }

      .toolbar {
        display: flex;
        align-items: center;
        font-size: 20px;
        height: 65px;
        padding: 0 16px;
        pointer-events: none;
        background-color: var(--app-header-background-color);
        font-weight: 400;
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
        box-sizing: border-box;
      }

      ha-icon-button-arrow-prev,
      ::slotted([slot="toolbar-icon"]) {
        pointer-events: auto;
      }

      ha-icon-button-arrow-prev.hidden {
        visibility: hidden;
      }

      .main-title {
        margin: 0 0 0 24px;
        line-height: 20px;
        flex-grow: 1;
      }

      .content {
        position: relative;
        width: 100%;
        height: calc(100% - 65px);
        overflow-y: auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-subpage": HassSubpage;
  }
}
