import type { PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../src/data/lovelace/config/types";
import "../../../src/panels/lovelace/hui-root";
import type { HomeAssistant } from "../../../src/types";
import { EmbedLovelaceElement, isDashboardConfig } from "./lovelace";
import type { ScriptObject } from "./script-data";

/**
 * Renders a dashboard, or a dashboard strategy, with its tabs, with the
 * backend of a provider, see `EmbedElement`. Each dashboard keeps its own
 * view in `view`, so switching tabs and following links to its views don't
 * change the page's URL. The dashboard scrolls inside the element, under its
 * toolbar.
 */
@customElement("ha-embed-dashboard")
export class HaEmbedDashboard extends EmbedLovelaceElement<LovelaceRawConfig> {
  private _scroller = createRef<HTMLDivElement>();

  // The route of hui-root, here without a page URL around it. A new
  // configuration gives a new route, as hui-root only looks up the view of
  // the path again when its route changes, and the views may have moved.
  private _route = memoizeOne(
    (view: string | undefined, _config: LovelaceConfig) => ({
      prefix: "",
      path: `/${view ?? ""}`,
    })
  );

  protected get rawConfig() {
    return this.config;
  }

  protected isConfig(data: ScriptObject): data is LovelaceRawConfig {
    return isDashboardConfig(data);
  }

  // The view shown, and the views before it, which the back button of a
  // subview without a `back_path` goes back through, as the browser's back
  // would in the app
  private _shownView?: string;

  private _history: (string | undefined)[] = [];

  // Going back, or a navigate action with `navigation_replace`, which
  // replaces the view shown rather than adding to the views before it
  private _skipHistory = false;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (this.view === this._shownView) {
      return;
    }

    if (this._shownView !== undefined) {
      if (!this._skipHistory) {
        this._history.push(this._shownView);
      }

      this._scroller.value?.scrollTo({ top: 0 });
    }

    this._skipHistory = false;
    this._shownView = this.view;
  }

  protected navigateTo(path: string, replace?: boolean) {
    const view = this.viewOfPath(path);

    if (view === undefined || this.isSameView(view, this.view)) {
      return;
    }

    this._skipHistory = Boolean(replace);
    this.view = view;
  }

  // The embedded attribute is in the template, so that hui-root has it when
  // it connects and skips the listeners on the page
  protected renderContent(hass: HomeAssistant) {
    if (!this._lovelace?.config.views.length) {
      return undefined;
    }

    return html`<div class="scroller" ${ref(this._scroller)}>
      <hui-root
        embedded
        no-edit
        .hass=${hass}
        .lovelace=${this._lovelace}
        .route=${this._route(this.view, this._lovelace.config)}
        .narrow=${this._narrow.value ?? false}
        @view-navigate=${this._viewNavigate}
      ></hui-root>
    </div>`;
  }

  // A tab, or the back button of a subview, which goes to its `back_path`
  // when that is one of the dashboard's views, else to the view before it
  private _viewNavigate(ev: HASSDomEvent<HASSDomEvents["view-navigate"]>) {
    const view = this.viewOfPath(ev.detail.path);

    if (!ev.detail.back) {
      if (view !== undefined) {
        this.view = view;
      }

      return;
    }

    const target = view === undefined ? this._previousView() : view;

    // Following a `back_path` goes back too, so the view it goes to leaves
    // the views before
    if (
      view !== undefined &&
      this.isSameView(this._history[this._history.length - 1], view)
    ) {
      this._history.pop();
    }

    if (!this.isSameView(target, this.view)) {
      this._skipHistory = true;
      this.view = target;
    }
  }

  // The last view before that isn't the one shown, else the first view
  private _previousView(): string | undefined {
    while (this._history.length) {
      const previous = this._history.pop();

      if (!this.isSameView(previous, this.view)) {
        return previous;
      }
    }

    return undefined;
  }

  static styles = [
    EmbedLovelaceElement.styles,
    css`
      /* Contained, so that the toolbar and background of hui-root, which are
         fixed to the window in the app, are fixed to the element */
      :host {
        height: 600px;
        contain: layout paint;
      }
      .theme,
      .scroller {
        height: 100%;
      }
      .scroller {
        overflow: auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-dashboard": HaEmbedDashboard;
  }
}
