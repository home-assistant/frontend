import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { goBack } from "../common/navigate";
import "./ha-icon-button-arrow-prev";
import "./ha-menu-button";

const PASSIVE_EVENT_OPTIONS = { passive: true } as const;

export const haTopAppBarFixedStyles = css`
  :host {
    display: block;
    --total-top-app-bar-height: calc(
      var(--header-height, 0px) + var(--sub-row-height, 0px)
    );
    --sub-row-height: 0px;
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
      box-shadow var(--ha-animation-duration-normal) ease,
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
    box-sizing: border-box;
    display: flex;
    width: 100%;
    align-items: center;
    height: var(--header-height);
    border-bottom: var(--app-header-border-bottom);
  }

  .top-app-bar.has-sub-row .row {
    border-bottom: 0;
  }

  .sub-row {
    box-sizing: border-box;
    display: block;
    width: 100%;
    overflow: hidden;
    border-bottom: var(--app-header-border-bottom);
  }

  .sub-row slot,
  .sub-row ::slotted(*) {
    box-sizing: border-box;
    display: block;
    width: 100%;
  }

  .sub-row[hidden] {
    display: none;
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
    height: calc(
      100vh - var(--total-top-app-bar-height, 0px) - var(
          --safe-area-inset-top,
          0px
        ) - var(--safe-area-inset-bottom, 0px)
    );
    padding-top: calc(
      var(--total-top-app-bar-height, 0px) + var(--safe-area-inset-top, 0px)
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

  @property({ attribute: "back-button", type: Boolean }) backButton = false;

  @property({ attribute: "center-title", type: Boolean }) centerTitle = false;

  @query(".top-app-bar") protected _barElement!: HTMLElement;

  @query(".sub-row") protected _subRowElement?: HTMLElement;

  @state() private _hasSubRow = false;

  private _scrollTarget?: HTMLElement | Window;

  private _subRowResizeObserver?: ResizeObserver;

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
      this._observeSubRowHeight();
      this._updateSubRowHeight();
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
          "has-sub-row": this._hasSubRow,
        })}"
      >
        <div class="row">
          ${paneHeader
            ? html`<section class="section" id="title">
                ${this._renderNavigationIcon()} ${title}
              </section>`
            : nothing}
          <section class="section" id="navigation">
            ${paneHeader
              ? nothing
              : html`${this._renderNavigationIcon()}
                ${this.centerTitle ? nothing : title}`}
          </section>
          ${!paneHeader && this.centerTitle
            ? html`<section class="section center">${title}</section>`
            : nothing}
          <section class="section end" id="actions" role="toolbar">
            <slot name="actionItems"></slot>
          </section>
        </div>
        <div class="sub-row" ?hidden=${!this._hasSubRow}>
          <slot name="subRow" @slotchange=${this._subRowSlotChanged}></slot>
        </div>
      </header>
    `;
  }

  private _renderNavigationIcon() {
    return html`
      <slot name="navigationIcon">
        ${this.backButton
          ? html`
              <ha-icon-button-arrow-prev
                @click=${this._handleBackClick}
              ></ha-icon-button-arrow-prev>
            `
          : html`<ha-menu-button></ha-menu-button>`}
      </slot>
    `;
  }

  protected _renderContent() {
    return html`<div class="top-app-bar-fixed-adjust">
      <slot></slot>
    </div>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    this._observeSubRowHeight();
    this._updateSubRowHeight();
    this._updateBarPosition();
    this._registerListeners();
    this._syncScrollState();
  }

  protected override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("_hasSubRow")) {
      this._updateSubRowHeight();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unobserveSubRowHeight();
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

  private _handleBackClick(ev: Event) {
    ev.stopPropagation();
    goBack();
  }

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

  private _observeSubRowHeight() {
    if (
      this._subRowResizeObserver ||
      !this._subRowElement ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }
    this._subRowResizeObserver = new ResizeObserver(this._updateSubRowHeight);
    this._subRowResizeObserver.observe(this._subRowElement);
  }

  private _unobserveSubRowHeight() {
    this._subRowResizeObserver?.disconnect();
    this._subRowResizeObserver = undefined;
  }

  private _subRowSlotChanged = (ev: Event) => {
    const slot = ev.currentTarget as HTMLSlotElement;
    this._hasSubRow = slot
      .assignedNodes({ flatten: true })
      .some(
        (node) =>
          node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
      );
  };

  private _updateSubRowHeight = () => {
    const subRowHeight = this._hasSubRow
      ? this._subRowElement?.offsetHeight || 0
      : 0;
    this.style.setProperty("--sub-row-height", `${subRowHeight}px`);
  };

  static override styles: CSSResultGroup = haTopAppBarFixedStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
