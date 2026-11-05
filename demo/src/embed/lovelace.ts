import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css } from "lit";
import { property, state } from "lit/decorators";
import { normalizeLovelaceConfig } from "../../../src/data/lovelace/config/normalize";
import type { LovelaceRawConfig } from "../../../src/data/lovelace/config/types";
import { isStrategyDashboard } from "../../../src/data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../src/data/lovelace/config/view";
import {
  checkStrategyShouldRegenerate,
  generateLovelaceDashboardStrategy,
} from "../../../src/panels/lovelace/strategies/get-strategy";
import type { Lovelace } from "../../../src/panels/lovelace/types";
import type { HomeAssistant } from "../../../src/types";
import { EmbedElement } from "./embed-element";
import type { ScriptObject } from "./script-data";
import { embedElementStyles } from "./theme-styles";

// The width below which the app is narrow, see home-assistant-main
const NARROW_WIDTH = 870;

/** The index of the view with this path or index, if there is one. */
const viewIndex = (
  views: LovelaceViewRawConfig[],
  view: string
): number | undefined => {
  const byPath = views.findIndex((item) => item.path === view);

  if (byPath !== -1) {
    return byPath;
  }

  const index = Number(view);

  return Number.isInteger(index) && index >= 0 && index < views.length
    ? index
    : undefined;
};

/** Whether script data is a dashboard: its views, or a strategy for them. */
export const isDashboardConfig = (
  data: ScriptObject
): data is LovelaceRawConfig => "views" in data || "strategy" in data;

/** The index of the view with this path or index, else the first view. */
export const findViewIndex = (
  views: LovelaceViewRawConfig[],
  view?: string
): number => (view === undefined ? 0 : (viewIndex(views, view) ?? 0));

/**
 * The base of the embed elements that render a dashboard, or one of its
 * views. It generates dashboard strategies, again when the registries they
 * depend on change, and holds a dashboard that can't be edited or saved.
 */
export abstract class EmbedLovelaceElement<
  Config extends ScriptObject,
> extends EmbedElement<Config> {
  /** The path or index of the view to show. Without it, the first view. */
  @property() public view?: string;

  @state() protected _lovelace?: Lovelace;

  // Narrow like the app at the same width, measured on the element because
  // it rarely takes the width of the page
  protected _narrow = new ResizeController(this, {
    callback: (entries) =>
      (entries[0]?.contentRect.width ?? NARROW_WIDTH) < NARROW_WIDTH,
  });

  // The configuration of the dashboard in `_lovelace`, or being generated
  private _rawConfig?: LovelaceRawConfig;

  // Counts the generations started, so that only the latest one is shown.
  // Generating again for changed registries keeps the same configuration.
  private _generation = 0;

  // The backend at the last update, to tell what a strategy depends on changed
  private _previousHass?: HomeAssistant;

  /** The dashboard to render. The same object until it changes. */
  protected abstract get rawConfig(): LovelaceRawConfig | undefined;

  /**
   * The view of the dashboard a path goes to, relative like `batteries` or
   * with the dashboard like `/maintenance/batteries`, if it has that view.
   */
  protected viewOfPath(path: string | undefined): string | undefined {
    const views = this._lovelace?.config.views;

    const view = path
      ? decodeURI(new URL(path, "http://embed/").pathname)
          .split("/")
          .filter(Boolean)
          .pop()
      : undefined;

    return views && view !== undefined && viewIndex(views, view) !== undefined
      ? view
      : undefined;
  }

  /** Whether two paths or indexes go to the same view of the dashboard. */
  protected isSameView(a?: string, b?: string): boolean {
    const views = this._lovelace?.config.views;

    return views
      ? findViewIndex(views, a) === findViewIndex(views, b)
      : a === b;
  }

  // A path to one of the dashboard's views shows that view. Other paths leave
  // the dashboard where it is.
  protected navigateTo(path: string) {
    const view = this.viewOfPath(path);

    if (view !== undefined) {
      this.view = view;
    }
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    const raw = this.rawConfig;
    const oldHass = this._previousHass;

    this._previousHass = this._hass;

    // Without a configuration, nothing is shown, and a generation still
    // running is dropped
    if (!raw) {
      if (this._rawConfig) {
        this._rawConfig = undefined;
        this._lovelace = undefined;
        this._generation++;
      }

      return;
    }

    if (!this._hass) {
      return;
    }

    // A strategy is only asked whether to generate again when the backend
    // changed, as in ha-panel-lovelace, not when the generated dashboard
    // arrives
    if (
      raw !== this._rawConfig ||
      (oldHass &&
        oldHass !== this._hass &&
        isStrategyDashboard(raw) &&
        this._hass.config.state === "RUNNING" &&
        checkStrategyShouldRegenerate(
          "dashboard",
          raw.strategy,
          oldHass,
          this._hass
        ))
    ) {
      this._rawConfig = raw;
      this._generate(raw, this._hass, ++this._generation);
    }
  }

  private async _generate(
    raw: LovelaceRawConfig,
    hass: HomeAssistant,
    generation: number
  ) {
    const generated = isStrategyDashboard(raw)
      ? await generateLovelaceDashboardStrategy(raw, hass)
      : raw;

    const config = normalizeLovelaceConfig(generated);

    // A newer generation has started. A generated dashboard has its views,
    // rather than a strategy.
    if (generation !== this._generation || isStrategyDashboard(config)) {
      return;
    }

    this._lovelace = {
      config,
      rawConfig: raw,
      editMode: false,
      urlPath: null,
      mode: "generated",
      locale: hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
      embedded: true,
    };
  }

  // The background of a dashboard, and no insets for a notch or home bar
  static styles: CSSResultGroup = [
    embedElementStyles,
    css`
      :host {
        display: block;
        --app-safe-area-inset-top: 0px;
        --app-safe-area-inset-bottom: 0px;
        --app-safe-area-inset-left: 0px;
        --app-safe-area-inset-right: 0px;
      }
      .theme {
        position: relative;
        background: var(--primary-background-color);
      }
    `,
  ];
}
