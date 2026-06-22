import { ContextProvider } from "@lit/context";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import {
  buildRelatedIdSets,
  type RelatedIdSets,
} from "../common/search/related-context";
import { relatedContext, type RelatedContextItem } from "../data/context";
import { findRelated } from "../data/search";
import type { HassBaseEl } from "./hass-base-mixin";

declare global {
  interface Window {
    /** Debugging aid: snapshot of the related context currently provided. */
    haContext?: { related?: RelatedIdSets };
  }
}

/**
 * Standalone context provider for `relatedContext`.
 *
 * Listens for `hass-related-context` events fired by child components,
 * resolves the related entities/devices/areas via `findRelated`, and
 * provides the resolved `RelatedIdSets` to context consumers.
 *
 * The current value is mirrored to `window.haContext?.related` to make debugging
 * from the console easier.
 *
 * Clears on actual page navigation (pathname change), not on dialog
 * history manipulation (`popstate` from dialog close).
 *
 * Instantiated from `context-mixin.ts` alongside other providers.
 */
export class RelatedContextProvider {
  private _relatedContext?: RelatedContextItem;

  private _provider: ContextProvider<typeof relatedContext>;

  private _contextPathname?: string;

  private _fetchRelatedMemoized = memoizeOne(
    (itemType: RelatedContextItem["itemType"], itemId: string) =>
      findRelated(this._host.hass!, itemType, itemId)
  );

  constructor(private _host: HassBaseEl) {
    this._provider = new ContextProvider(_host, { context: relatedContext });
  }

  /**
   * Set up event listeners. Call from `firstUpdated` or `hassConnected`.
   */
  public connect(): void {
    this._host.addEventListener("hass-related-context", this._onRelatedContext);
    mainWindow.addEventListener(
      "location-changed",
      this._maybeClearRelatedContext
    );
    mainWindow.addEventListener("popstate", this._maybeClearRelatedContext);
  }

  /**
   * Clean up event listeners. Call from `disconnectedCallback`.
   */
  public disconnect(): void {
    this._host.removeEventListener(
      "hass-related-context",
      this._onRelatedContext
    );
    mainWindow.removeEventListener(
      "location-changed",
      this._maybeClearRelatedContext
    );
    mainWindow.removeEventListener("popstate", this._maybeClearRelatedContext);
  }

  private _onRelatedContext = (
    ev: HASSDomEvent<RelatedContextItem | undefined>
  ): void => {
    // `fireEvent` coerces an undefined detail to `{}`, so a clear arrives
    // without an itemId; normalise that back to undefined.
    const context = ev.detail?.itemId ? ev.detail : undefined;
    this._relatedContext = context;
    this._contextPathname = context ? mainWindow.location.pathname : undefined;
    this._resolveRelatedContext(context);
  };

  /**
   * Only clear context when the actual page pathname changes.
   * Dialog open/close manipulates history state without changing the URL,
   * so we ignore those popstate/location-changed events.
   */
  private _maybeClearRelatedContext = (): void => {
    if (
      this._contextPathname &&
      mainWindow.location.pathname === this._contextPathname
    ) {
      return;
    }
    this._relatedContext = undefined;
    this._contextPathname = undefined;
    this._setValue(undefined);
  };

  private _contextMatches = (context?: RelatedContextItem): boolean =>
    context?.itemType === this._relatedContext?.itemType &&
    context?.itemId === this._relatedContext?.itemId;

  private _resolveRelatedContext = async (
    context?: RelatedContextItem
  ): Promise<void> => {
    if (!context || !this._host.hass) {
      this._setValue(undefined);
      return;
    }

    try {
      const related = await this._fetchRelatedMemoized(
        context.itemType,
        context.itemId
      );
      if (this._contextMatches(context)) {
        this._setValue(buildRelatedIdSets(related));
      }
    } catch (_err) {
      if (this._contextMatches(context)) {
        this._setValue(undefined);
      }
    }
  };

  // Mirror the provided value to `window.haContext?.related` for console debugging.
  private _setValue(value: RelatedIdSets | undefined): void {
    this._provider.setValue(value);
    const windowContext = (window.haContext ??= {});
    windowContext.related = value;
  }
}
