import {
  addHasRemoveClass,
  BaseElement,
} from "@material/mwc-base/base-element";
import { supportsPassiveEventListener } from "@material/mwc-base/utils";
import { MDCTopAppBarAdapter } from "@material/top-app-bar/adapter";
import { strings } from "@material/top-app-bar/constants";
import MDCFixedTopAppBarFoundation from "@material/top-app-bar/fixed/foundation";
import { html, css, nothing } from "lit";
import { property, query, customElement } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { haStyleScrollbar } from "../resources/styles";

export const passiveEventOptionsIfSupported = supportsPassiveEventListener
  ? { passive: true }
  : undefined;

@customElement("ha-two-pane-top-app-bar-fixed")
export abstract class TopAppBarBaseBase extends BaseElement {
  protected override mdcFoundation!: MDCFixedTopAppBarFoundation;

  protected override mdcFoundationClass = MDCFixedTopAppBarFoundation;

  @query(".mdc-top-app-bar") protected mdcRoot!: HTMLElement;

  // _actionItemsSlot should have type HTMLSlotElement, but when TypeScript's
  // emitDecoratorMetadata is enabled, the HTMLSlotElement constructor will
  // be emitted into the runtime, which will cause an "HTMLSlotElement is
  // undefined" error in browsers that don't define it (e.g. IE11).
  @query('slot[name="actionItems"]') protected _actionItemsSlot!: HTMLElement;

  protected _scrollTarget!: HTMLElement | Window;

  @property({ type: Boolean }) centerTitle = false;

  @property({ type: Boolean, reflect: true }) prominent = false;

  @property({ type: Boolean, reflect: true }) dense = false;

  @property({ type: Boolean }) pane = false;

  @property({ type: Boolean }) footer = false;

  @query(".content") private _contentElement!: HTMLElement;

  @query(".pane .ha-scrollbar") private _paneElement?: HTMLElement;

  @property({ type: Object })
  get scrollTarget() {
    return this._scrollTarget || window;
  }

  set scrollTarget(value) {
    this.unregisterListeners();
    const old = this.scrollTarget;
    this._scrollTarget = value;
    this.updateRootPosition();
    this.requestUpdate("scrollTarget", old);
    this.registerListeners();
  }

  protected updateRootPosition() {
    if (this.mdcRoot) {
      const windowScroller = this.scrollTarget === window;
      // we add support for top-app-bar's tied to an element scroller.
      this.mdcRoot.style.position = windowScroller ? "" : "absolute";
    }
  }

  protected barClasses() {
    return {
      "mdc-top-app-bar--dense": this.dense,
      "mdc-top-app-bar--prominent": this.prominent,
      "center-title": this.centerTitle,
      "mdc-top-app-bar--fixed": true,
      "mdc-top-app-bar--pane": this.pane,
    };
  }

  protected contentClasses() {
    return {
      "mdc-top-app-bar--fixed-adjust": !this.dense && !this.prominent,
      "mdc-top-app-bar--dense-fixed-adjust": this.dense && !this.prominent,
      "mdc-top-app-bar--prominent-fixed-adjust": !this.dense && this.prominent,
      "mdc-top-app-bar--dense-prominent-fixed-adjust":
        this.dense && this.prominent,
      "mdc-top-app-bar--pane": this.pane,
    };
  }

  protected override render() {
    const title = html`<span class="mdc-top-app-bar__title"
      ><slot name="title"></slot
    ></span>`;
    return html`
      <header class="mdc-top-app-bar ${classMap(this.barClasses())}">
        <div class="mdc-top-app-bar__row">
          ${this.pane
            ? html`<section
                class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start"
                id="title"
              >
                <slot
                  name="navigationIcon"
                  @click=${this.handleNavigationClick}
                ></slot>
                ${title}
              </section>`
            : nothing}
          <section class="mdc-top-app-bar__section" id="navigation">
            ${this.pane
              ? nothing
              : html`<slot
                    name="navigationIcon"
                    @click=${this.handleNavigationClick}
                  ></slot
                  >${title}`}
          </section>
          <section
            class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end"
            id="actions"
            role="toolbar"
          >
            <slot name="actionItems"></slot>
          </section>
        </div>
      </header>
      <div class=${classMap(this.contentClasses())}>
        ${this.pane
          ? html`<div class="pane">
              <div class="shadow-container"></div>
              <div class="ha-scrollbar">
                <slot name="pane"></slot>
              </div>
              ${this.footer
                ? html`<div class="footer">
                    <slot name="pane-footer"></slot>
                  </div>`
                : nothing}
            </div>`
          : nothing}
        <div class="main">
          ${this.pane ? html`<div class="shadow-container"></div>` : nothing}
          <div class="content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }

  protected updated(changedProperties) {
    super.updated(changedProperties);
    if (
      changedProperties.has("pane") &&
      changedProperties.get("pane") !== undefined
    ) {
      this.unregisterListeners();
      this.registerListeners();
    }
  }

  protected createAdapter(): MDCTopAppBarAdapter {
    return {
      ...addHasRemoveClass(this.mdcRoot),
      setStyle: (prprty: string, value: string) =>
        this.mdcRoot.style.setProperty(prprty, value),
      getTopAppBarHeight: () => this.mdcRoot.clientHeight,
      notifyNavigationIconClicked: () => {
        this.dispatchEvent(
          new Event(strings.NAVIGATION_EVENT, {
            bubbles: true,
            cancelable: true,
          })
        );
      },
      getViewportScrollY: () =>
        this.scrollTarget instanceof Window
          ? this.scrollTarget.pageYOffset
          : this.scrollTarget.scrollTop,
      getTotalActionItems: () =>
        (this._actionItemsSlot as HTMLSlotElement).assignedNodes({
          flatten: true,
        }).length,
    };
  }

  protected handleTargetScroll = () => {
    this.mdcFoundation.handleTargetScroll();
  };

  protected handlePaneScroll = (ev) => {
    if (ev.target.scrollTop > 0) {
      ev.target.parentElement.classList.add("scrolled");
    } else {
      ev.target.parentElement.classList.remove("scrolled");
    }
  };

  protected handleNavigationClick = () => {
    this.mdcFoundation.handleNavigationClick();
  };

  protected registerListeners() {
    if (this.pane) {
      this._paneElement!.addEventListener(
        "scroll",
        this.handlePaneScroll,
        passiveEventOptionsIfSupported
      );
      this._contentElement.addEventListener(
        "scroll",
        this.handlePaneScroll,
        passiveEventOptionsIfSupported
      );
      return;
    }
    this.scrollTarget.addEventListener(
      "scroll",
      this.handleTargetScroll,
      passiveEventOptionsIfSupported
    );
  }

  protected unregisterListeners() {
    this._paneElement?.removeEventListener("scroll", this.handlePaneScroll);
    this._contentElement.removeEventListener("scroll", this.handlePaneScroll);
    this.scrollTarget.removeEventListener("scroll", this.handleTargetScroll);
  }

  protected override firstUpdated() {
    super.firstUpdated();
    this.updateRootPosition();
    this.registerListeners();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unregisterListeners();
  }

  static override styles = [
    styles,
    haStyleScrollbar,
    css`
      .mdc-top-app-bar__row {
        height: var(--header-height);
        border-bottom: var(--app-header-border-bottom);
      }
      .mdc-top-app-bar--fixed-adjust {
        padding-top: var(--header-height);
      }
      .shadow-container {
        position: absolute;
        top: calc(-1 * var(--header-height));
        width: 100%;
        height: var(--header-height);
        z-index: 1;
        transition: box-shadow 200ms linear;
      }
      .scrolled .shadow-container {
        box-shadow: var(
          --mdc-top-app-bar-fixed-box-shadow,
          0px 2px 4px -1px rgba(0, 0, 0, 0.2),
          0px 4px 5px 0px rgba(0, 0, 0, 0.14),
          0px 1px 10px 0px rgba(0, 0, 0, 0.12)
        );
      }
      .mdc-top-app-bar {
        --mdc-typography-headline6-font-weight: 400;
        color: var(--app-header-text-color, var(--mdc-theme-on-primary, #fff));
        background-color: var(
          --app-header-background-color,
          var(--mdc-theme-primary)
        );
      }
      .mdc-top-app-bar--pane.mdc-top-app-bar--fixed-scrolled {
        box-shadow: none;
      }
      #title {
        border-right: 1px solid rgba(255, 255, 255, 0.12);
        box-sizing: border-box;
        flex: 0 0 var(--sidepane-width, 250px);
        width: var(--sidepane-width, 250px);
      }
      div.mdc-top-app-bar--pane {
        display: flex;
        height: calc(100vh - var(--header-height));
      }
      .pane {
        border-right: 1px solid var(--divider-color);
        box-sizing: border-box;
        display: flex;
        flex: 0 0 var(--sidepane-width, 250px);
        width: var(--sidepane-width, 250px);
        flex-direction: column;
        position: relative;
      }
      .pane .ha-scrollbar {
        flex: 1;
      }
      .pane .footer {
        border-top: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
      .main {
        min-height: 100%;
      }
      .mdc-top-app-bar--pane .main {
        position: relative;
        flex: 1;
        height: 100%;
      }
      .mdc-top-app-bar--pane .content {
        height: 100%;
        overflow: auto;
      }
    `,
  ];
}
