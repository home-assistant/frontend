import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { afterNextRender } from "../../common/util/render-status";
import { debounce } from "../../common/util/debounce";
import type { HomeAssistant } from "../../types";
import type { Lovelace } from "./types";
import "./views/hui-view";
import type { HUIView } from "./views/hui-view";
import "./views/hui-view-background";
import "./views/hui-view-container";

@customElement("hui-lovelace")
export class HUILovelace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false, type: Number }) public curView?: number;

  private _displayedView?: number;

  private _viewCache?: Record<number, HUIView>;

  private _viewScrollPositions: Record<number, number> = {};

  private _restoreScroll = false;

  private _debouncedConfigChanged = debounce(
    () => this._selectView(this._displayedView, true),
    100,
    false
  );

  private get _viewRoot(): HTMLDivElement {
    return this.shadowRoot!.getElementById("view") as HTMLDivElement;
  }

  private _handleWindowScroll = () => {
    this.toggleAttribute("scrolled", window.scrollY !== 0);
  };

  private _handlePopState = () => {
    this._restoreScroll = true;
  };

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("scroll", this._handleWindowScroll, {
      passive: true,
    });
    window.addEventListener("popstate", this._handlePopState);
    // Disable history scroll restoration because it is managed manually here
    window.history.scrollRestoration = "manual";
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("scroll", this._handleWindowScroll);
    window.removeEventListener("popstate", this._handlePopState);
    this.toggleAttribute("scrolled", window.scrollY !== 0);
    // Re-enable history scroll restoration when leaving the page
    window.history.scrollRestoration = "auto";
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!this.lovelace) {
      return;
    }

    const view = this._viewRoot;
    const huiView = view?.lastChild as HUIView | undefined;

    if (changedProperties.has("hass") && huiView) {
      huiView.hass = this.hass;
    }

    if (changedProperties.has("narrow") && huiView) {
      huiView.narrow = this.narrow;
    }

    let newSelectView: number | undefined;
    let force = false;

    if (changedProperties.has("curView")) {
      newSelectView = this.curView;
    }

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as
        | Lovelace
        | undefined;

      if (!oldLovelace || oldLovelace.config !== this.lovelace.config) {
        // On config change, recreate the current view from scratch.
        force = true;
        newSelectView = this.curView;
      }

      if (!force && huiView) {
        huiView.lovelace = this.lovelace;
      }
    }

    if (newSelectView !== undefined || force) {
      if (force && newSelectView === undefined) {
        newSelectView = this.curView;
      }
      // Will allow for ripples to start rendering
      afterNextRender(() => {
        if (changedProperties.has("curView")) {
          const position =
            (this._restoreScroll &&
              newSelectView !== undefined &&
              this._viewScrollPositions[newSelectView]) ||
            0;
          this._restoreScroll = false;
          requestAnimationFrame(() =>
            scrollTo({ behavior: "auto", top: position })
          );
        }
        this._selectView(newSelectView, force);
      });
    }
  }

  private _selectView(viewIndex: number | undefined, force: boolean): void {
    if (!force && this._displayedView === viewIndex) {
      return;
    }

    // Save scroll position of current view
    if (this._displayedView != null) {
      this._viewScrollPositions[this._displayedView] = window.scrollY;
    }

    viewIndex = viewIndex === undefined ? 0 : viewIndex;

    this._displayedView = viewIndex;

    if (force) {
      this._viewCache = {};
      this._viewScrollPositions = {};
    }

    // Recreate a new element to clear the applied themes.
    const root = this._viewRoot;

    if (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!this.lovelace) {
      return;
    }

    const viewConfig = this.lovelace.config.views[viewIndex];

    if (!viewConfig) {
      return;
    }

    let view: HUIView;

    // Use cached view if available
    if (!force && this._viewCache![viewIndex]) {
      view = this._viewCache![viewIndex];
    } else {
      view = document.createElement("hui-view");
      view.index = viewIndex;
      this._viewCache![viewIndex] = view;
    }

    view.lovelace = this.lovelace;
    view.hass = this.hass;
    view.narrow = this.narrow;

    root.appendChild(view);
  }

  protected render() {
    if (!this.lovelace) {
      return nothing;
    }

    const curViewConfig =
      this.curView !== undefined
        ? this.lovelace.config.views[this.curView]
        : undefined;

    const background =
      curViewConfig?.background || this.lovelace.config.background;

    return html`
      <hui-view-container
        .hass=${this.hass}
        .theme=${curViewConfig?.theme}
        @ll-rebuild=${this._debouncedConfigChanged}
      >
        <div id="view"></div>
      </hui-view-container>
      <hui-view-background .hass=${this.hass} .background=${background}>
      </hui-view-background>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex: 1;
    }
    hui-view-container {
      flex: 1;
      display: flex;
    }
    #view {
      flex: 1 1 100%;
      max-width: 100%;
      display: flex;
    }
    #view > * {
      flex: 1 1 100%;
      max-width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lovelace": HUILovelace;
  }
}
