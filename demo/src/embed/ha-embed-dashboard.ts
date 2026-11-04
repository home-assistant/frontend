import type { PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import type { LovelaceRawConfig } from "../../../src/data/lovelace/config/types";
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

  // The route of hui-root, here without a page URL around it
  private _route = memoizeOne((view = "") => ({
    prefix: "",
    path: `/${view}`,
  }));

  protected get rawConfig() {
    return this.config;
  }

  protected isConfig(data: ScriptObject): data is LovelaceRawConfig {
    return isDashboardConfig(data);
  }

  // The view shown, and the one before it, which a subview without a
  // `back_path` goes back to, as the browser's back would in the app
  private _shownView?: string;

  private _previousView?: string;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (this.view === this._shownView) {
      return;
    }

    if (this._shownView !== undefined) {
      this._previousView = this._shownView;
      this._scroller.value?.scrollTo({ top: 0 });
    }

    this._shownView = this.view;
  }

  // The embedded attribute is in the template, so that hui-root has it when
  // it connects and skips the listeners on the page
  protected renderContent(hass: HomeAssistant) {
    if (!this._lovelace) {
      return undefined;
    }

    return html`<div class="scroller" ${ref(this._scroller)}>
      <hui-root
        embedded
        no-edit
        .hass=${hass}
        .lovelace=${this._lovelace}
        .route=${this._route(this.view)}
        .narrow=${this._narrow.value ?? false}
        @view-navigate=${this._viewNavigate}
      ></hui-root>
    </div>`;
  }

  // A tab, or the back button of a subview, which goes back to the view
  // before it without a `back_path` to one of the dashboard's views
  private _viewNavigate(ev: HASSDomEvent<HASSDomEvents["view-navigate"]>) {
    this.view = this.viewOfPath(ev.detail.path) ?? this._previousView;
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
