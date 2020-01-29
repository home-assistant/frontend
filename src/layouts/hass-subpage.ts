import {
  LitElement,
  property,
  TemplateResult,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import "../components/ha-menu-button";
import "../components/ha-paper-icon-button-arrow-prev";
import { classMap } from "lit-html/directives/class-map";

@customElement("hass-subpage")
class HassSubpage extends LitElement {
  @property()
  public header?: string;
  @property({ type: Boolean })
  public showBackButton = true;
  @property({ type: Boolean })
  public hassio = false;

  protected render(): TemplateResult {
    return html`
      <div class="toolbar">
        <ha-paper-icon-button-arrow-prev
          aria-label="Back"
          .hassio=${this.hassio}
          @click=${this._backTapped}
          class=${classMap({ hidden: !this.showBackButton })}
        ></ha-paper-icon-button-arrow-prev>

        <div main-title>${this.header}</div>
        <slot name="toolbar-icon"></slot>
      </div>
      <div class="content"><slot></slot></div>
    `;
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
        height: 64px;
        padding: 0 16px;
        pointer-events: none;
        background-color: var(--app-header-background-color);
        font-weight: 400;
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
      }

      ha-menu-button,
      ha-paper-icon-button-arrow-prev,
      ::slotted([slot="toolbar-icon"]) {
        pointer-events: auto;
      }

      ha-paper-icon-button-arrow-prev.hidden {
        visibility: hidden;
      }

      [main-title] {
        margin: 0 0 0 24px;
        line-height: 20px;
        flex-grow: 1;
      }

      .content {
        position: relative;
        width: 100%;
        height: calc(100% - 64px);
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
