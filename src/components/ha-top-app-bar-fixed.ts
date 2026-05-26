import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

const PASSIVE_EVENT_OPTIONS = { passive: true } as const;

export const haTopAppBarFixedStyles = css`
  :host {
    display: block;
  }

  .top-app-bar {
    box-sizing: border-box;
    color: var(--app-header-text-color, #fff);
    background-color: var(--app-header-background-color, var(--primary-color));
    position: fixed;
    top: 0;
    inset-inline-end: 0;
    width: var(--ha-top-app-bar-width, 100%);
    z-index: 4;
    padding-top: var(--safe-area-inset-top);
    padding-right: var(--safe-area-inset-right);
    transition:
      width var(--ha-animation-duration-normal) ease,
      padding-left var(--ha-animation-duration-normal) ease,
      padding-right var(--ha-animation-duration-normal) ease;
  }

  :host([narrow]) .top-app-bar {
    padding-left: var(--safe-area-inset-left);
  }

  .top-app-bar.scrolled:not(.pane-header) {
    box-shadow: var(--ha-box-shadow-s);
  }

  .row {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    height: var(--header-height);
    border-bottom: var(--app-header-border-bottom);
  }

  .section {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-width: 0;
    height: 100%;
    padding: 0 var(--ha-space-3);
  }

  #navigation {
    flex: 1 1 auto;
  }

  .section.center {
    flex: 1 1 auto;
    justify-content: center;
    text-align: center;
  }

  .section.end {
    flex: none;
    justify-content: flex-end;
  }

  .title {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--ha-font-size-xl);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--header-height);
    padding-inline-start: var(--ha-space-6);
  }

  :host([narrow]) .title {
    padding-inline-start: var(--ha-space-2);
  }

  .top-app-bar-fixed-adjust {
    padding-top: calc(
      var(--header-height, 0px) + var(--safe-area-inset-top, 0px)
    );
    padding-bottom: var(--safe-area-inset-bottom);
    padding-right: var(--safe-area-inset-right);
  }

  :host([narrow]) .top-app-bar-fixed-adjust {
    padding-left: var(--safe-area-inset-left);
  }
`;

@customElement("ha-top-app-bar-fixed")
export class HaTopAppBarFixed extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "center-title", type: Boolean }) centerTitle = false;

  @query(".top-app-bar") protected _barElement!: HTMLElement;

  private _scrollTarget?: HTMLElement | Window;

  @property({ attribute: false })
  public get scrollTarget(): HTMLElement | Window {
    return this._scrollTarget || window;
  }

  public set scrollTarget(value: HTMLElement | Window) {
    const old = this.scrollTarget;
    this._unregisterListeners();
    this._scrollTarget = value;
    this._updateBarPosition();
    this.requestUpdate("scrollTarget", old);
    if (this.isConnected) {
      this._registerListeners();
      this._syncScrollState();
    }
  }

  protected _isPaneHeader(): boolean {
    return false;
  }

  protected render() {
    return html`${this._renderHeader()}${this._renderContent()}`;
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.hasUpdated) {
      this._updateBarPosition();
      this._registerListeners();
      this._syncScrollState();
    }
  }

  protected _renderHeader() {
    const title = html`<span class="title">
      <slot name="title"></slot>
    </span>`;
    const paneHeader = this._isPaneHeader();

    return html`
      <header
        class="top-app-bar ${classMap({
          "pane-header": paneHeader,
        })}"
      >
        <div class="row">
          ${paneHeader
            ? html`<section class="section" id="title">
                <slot name="navigationIcon"></slot>
                ${title}
              </section>`
            : nothing}
          <section class="section" id="navigation">
            ${paneHeader
              ? nothing
              : html`<slot name="navigationIcon"></slot> ${this.centerTitle
                    ? nothing
                    : title}`}
          </section>
          ${!paneHeader && this.centerTitle
            ? html`<section class="section center">${title}</section>`
            : nothing}
          <section class="section end" id="actions" role="toolbar">
            <slot name="actionItems"></slot>
          </section>
        </div>
      </header>
    `;
  }

  protected _renderContent() {
    return html`<div class="top-app-bar-fixed-adjust">
      <slot></slot>
    </div>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    this._updateBarPosition();
    this._registerListeners();
    this._syncScrollState();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unregisterListeners();
  }

  protected _updateBarPosition() {
    if (this._barElement) {
      this._barElement.style.position =
        this.scrollTarget === window ? "" : "absolute";
    }
  }

  protected _syncScrollState = () => {
    const scrollTop =
      this.scrollTarget instanceof Window
        ? this.scrollTarget.pageYOffset
        : this.scrollTarget.scrollTop;
    this._barElement?.classList.toggle("scrolled", scrollTop > 0);
  };

  protected _registerListeners() {
    this.scrollTarget.addEventListener(
      "scroll",
      this._syncScrollState,
      PASSIVE_EVENT_OPTIONS
    );
  }

  protected _unregisterListeners() {
    this.scrollTarget.removeEventListener("scroll", this._syncScrollState);
  }

  static override styles: CSSResultGroup = haTopAppBarFixedStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
