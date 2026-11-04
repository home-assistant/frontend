import { css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import memoizeOne from "memoize-one";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../src/data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../src/data/lovelace/config/view";
import "../../../src/panels/lovelace/views/hui-view";
import "../../../src/panels/lovelace/views/hui-view-background";
import "../../../src/panels/lovelace/views/hui-view-container";
import type { HomeAssistant } from "../../../src/types";
import {
  EmbedLovelaceElement,
  findViewIndex,
  isDashboardConfig,
} from "./lovelace";
import type { ScriptObject } from "./script-data";

/**
 * Renders a dashboard view, a view strategy, or one view of a dashboard or
 * dashboard strategy, with the backend of a provider, see `EmbedElement`.
 * `config` holds the view.
 */
@customElement("ha-embed-view")
export class HaEmbedView extends EmbedLovelaceElement<LovelaceViewRawConfig> {
  /**
   * A dashboard configuration or dashboard strategy, to show its `view`
   * instead of `config`. Also read from the `dashboard` key of a script child,
   * next to `view`.
   */
  @property({ type: Object }) public dashboard?: LovelaceRawConfig;

  private _viewDashboard = memoizeOne(
    (view: LovelaceViewRawConfig): LovelaceConfig => ({ views: [view] })
  );

  protected get rawConfig() {
    return this.dashboard ?? (this.config && this._viewDashboard(this.config));
  }

  // A view strategy and a dashboard strategy both have a `strategy` key, so
  // a dashboard comes in its own key, which no view has
  protected isConfig(data: ScriptObject): data is LovelaceViewRawConfig {
    return !("dashboard" in data);
  }

  protected setScriptData(data: ScriptObject) {
    if (!("dashboard" in data)) {
      super.setScriptData(data);

      return;
    }

    const { dashboard } = data;

    if (
      typeof dashboard === "object" &&
      dashboard !== null &&
      isDashboardConfig(dashboard)
    ) {
      this.dashboard = dashboard;
    }

    if (
      "view" in data &&
      (typeof data.view === "string" || typeof data.view === "number")
    ) {
      this.view ??= String(data.view);
    }
  }

  // Nothing for a dashboard without views, such as an empty strategy result.
  // The view's theme and background, or the dashboard's background, as in
  // hui-root. Each view gets its own hui-view, as there, so that a view
  // strategy still generating for the view before can't replace the cards of
  // this one.
  protected renderContent(hass: HomeAssistant) {
    const views = this._lovelace?.config.views;

    if (!this._lovelace || !views?.length) {
      return undefined;
    }

    const index = findViewIndex(views, this.view);
    const viewConfig = views[index];

    const background =
      viewConfig.background || this._lovelace.config.background;

    return html`<hui-view-container .hass=${hass} .theme=${viewConfig.theme}>
      <hui-view-background .hass=${hass} .background=${background}>
      </hui-view-background>
      ${keyed(
        viewConfig,
        html`<hui-view
          .hass=${hass}
          .lovelace=${this._lovelace}
          .index=${index}
          .narrow=${this._narrow.value ?? false}
        ></hui-view>`
      )}
    </hui-view-container>`;
  }

  // A fixed background stays inside the element. With a height set on the
  // element, a panel view fills it, and other views keep their own height.
  static styles = [
    EmbedLovelaceElement.styles,
    css`
      :host {
        contain: layout paint;
      }
      .theme,
      hui-view-container,
      hui-view {
        display: block;
        height: 100%;
      }
      /* The background sits below the view, above the element's own */
      hui-view-container {
        position: relative;
        isolation: isolate;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-view": HaEmbedView;
  }
}
