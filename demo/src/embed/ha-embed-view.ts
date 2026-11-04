import { html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type {
  LovelaceConfig,
  LovelaceRawConfig,
} from "../../../src/data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../src/data/lovelace/config/view";
import "../../../src/panels/lovelace/views/hui-view";
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

  // Nothing for a dashboard without views, such as an empty strategy result
  protected renderContent(hass: HomeAssistant) {
    if (!this._lovelace?.config.views.length) {
      return undefined;
    }

    return html`<hui-view
      .hass=${hass}
      .lovelace=${this._lovelace}
      .index=${findViewIndex(this._lovelace.config.views, this.view)}
      .narrow=${this._narrow.value ?? false}
    ></hui-view>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-view": HaEmbedView;
  }
}
