import type { PropertyValues } from "lit";
import { html, css, nothing } from "lit";
import { property, query, customElement } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { haStyleScrollbar } from "../resources/styles";
import {
  HaTopAppBarFixed,
  haTopAppBarFixedStyles,
} from "./ha-top-app-bar-fixed";

const PASSIVE_EVENT_OPTIONS = { passive: true } as const;

@customElement("ha-two-pane-top-app-bar-fixed")
export class HaTwoPaneTopAppBarFixed extends HaTopAppBarFixed {
  @property({ type: Boolean }) pane = false;

  @property({ type: Boolean }) footer = false;

  @query(".content") private _contentElement?: HTMLElement;

  @query(".pane .ha-scrollbar") private _paneElement?: HTMLElement;

  protected override _isPaneHeader(): boolean {
    return this.pane;
  }

  protected override _renderContent() {
    return html`
      <div
        class=${classMap({
          "top-app-bar-fixed-adjust": true,
          "top-app-bar-fixed-adjust--pane": this.pane,
        })}
      >
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

  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("pane") && this.hasUpdated) {
      this._unregisterListeners();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (
      changedProperties.has("pane") &&
      changedProperties.get("pane") !== undefined
    ) {
      this._registerListeners();
      this._syncScrollState();
    }
  }

  private _handlePaneScroll = (ev: Event) => {
    const target = ev.currentTarget as HTMLElement;
    target.parentElement?.classList.toggle("scrolled", target.scrollTop > 0);
  };

  protected override _registerListeners() {
    if (this.pane) {
      this._paneElement?.addEventListener(
        "scroll",
        this._handlePaneScroll,
        PASSIVE_EVENT_OPTIONS
      );
      this._contentElement?.addEventListener(
        "scroll",
        this._handlePaneScroll,
        PASSIVE_EVENT_OPTIONS
      );
      return;
    }

    super._registerListeners();
  }

  protected override _unregisterListeners() {
    this._paneElement?.removeEventListener("scroll", this._handlePaneScroll);
    this._contentElement?.removeEventListener("scroll", this._handlePaneScroll);
    super._unregisterListeners();
  }

  static override styles = [
    haTopAppBarFixedStyles,
    haStyleScrollbar,
    css`
      .shadow-container {
        position: absolute;
        top: calc(-1 * var(--header-height));
        width: 100%;
        height: var(--header-height);
        z-index: 1;
        transition: box-shadow 200ms linear;
      }

      .scrolled .shadow-container {
        box-shadow: var(--ha-box-shadow-m);
      }

      #title {
        border-right: 1px solid rgba(255, 255, 255, 0.12);
        border-inline-end: 1px solid rgba(255, 255, 255, 0.12);
        border-inline-start: initial;
        box-sizing: border-box;
        flex: 0 0 var(--sidepane-width, 250px);
        width: var(--sidepane-width, 250px);
      }

      .top-app-bar-fixed-adjust--pane {
        display: flex;
        height: calc(
          100vh - var(--header-height, 0px) - var(
              --safe-area-inset-top,
              0px
            ) - var(--safe-area-inset-bottom, 0px)
        );
      }

      .pane {
        border-right: 1px solid var(--divider-color);
        border-inline-end: 1px solid var(--divider-color);
        border-inline-start: initial;
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

      .top-app-bar-fixed-adjust--pane .main {
        position: relative;
        flex: 1;
        height: 100%;
      }

      .top-app-bar-fixed-adjust--pane .content {
        height: 100%;
        overflow: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-two-pane-top-app-bar-fixed": HaTwoPaneTopAppBarFixed;
  }
}
