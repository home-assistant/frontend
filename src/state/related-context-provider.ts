import { ContextProvider } from "@lit/context";
import memoizeOne from "memoize-one";
import type { ReactiveElement } from "lit";
import { mainWindow } from "../common/dom/get_main_window";
import { buildRelatedIdSets } from "../common/search/related-context";
import { relatedContext, type RelatedContextItem } from "../data/context";
import { findRelated } from "../data/search";
import type { HomeAssistant } from "../types";

/**
 * Standalone context provider for `relatedContext`.
 *
 * Listens for `hass-related-context` events fired by child components,
 * resolves the related entities/devices/areas via `findRelated`, and
 * provides the resolved `RelatedIdSets` to context consumers.
 *
 * Clears on navigation (`location-changed` / `popstate`).
 *
 * Instantiated from `context-mixin.ts` alongside other providers.
 */
export class RelatedContextProvider {
  private _host: ReactiveElement;

  private _hassGetter: () => HomeAssistant | undefined;

  private _relatedContext?: RelatedContextItem;

  private _provider: ContextProvider<typeof relatedContext>;

  private _fetchRelatedMemoized = memoizeOne(
    (itemType: RelatedContextItem["itemType"], itemId: string) =>
      findRelated(this._hassGetter()!, itemType, itemId)
  );

  constructor(
    host: ReactiveElement,
    hassGetter: () => HomeAssistant | undefined
  ) {
    this._host = host;
    this._hassGetter = hassGetter;
    this._provider = new ContextProvider(host, { context: relatedContext });
  }

  /**
   * Set up event listeners. Call from `firstUpdated` or `hassConnected`.
   */
  public connect(): void {
    this._host.addEventListener(
      "hass-related-context" as any,
      this._onRelatedContext
    );
    mainWindow.addEventListener("location-changed", this._clearRelatedContext);
    mainWindow.addEventListener("popstate", this._clearRelatedContext);
  }

  /**
   * Clean up event listeners. Call from `disconnectedCallback`.
   */
  public disconnect(): void {
    mainWindow.removeEventListener(
      "location-changed",
      this._clearRelatedContext
    );
    mainWindow.removeEventListener("popstate", this._clearRelatedContext);
  }

  private _onRelatedContext = (ev: Event): void => {
    const detail = (ev as CustomEvent).detail;
    this._relatedContext =
      detail && "itemType" in detail && "itemId" in detail ? detail : undefined;
    this._resolveRelatedContext(this._relatedContext);
  };

  private _clearRelatedContext = (): void => {
    this._relatedContext = undefined;
    this._provider.setValue(undefined);
  };

  private _contextMatches = (context?: RelatedContextItem): boolean =>
    context?.itemType === this._relatedContext?.itemType &&
    context?.itemId === this._relatedContext?.itemId;

  private _resolveRelatedContext = async (
    context?: RelatedContextItem
  ): Promise<void> => {
    this._provider.setValue(undefined);
    if (!context) {
      return;
    }

    try {
      const related = await this._fetchRelatedMemoized(
        context.itemType,
        context.itemId
      );
      if (this._contextMatches(context)) {
        this._provider.setValue(buildRelatedIdSets(related));
      }
    } catch (_err) {
      if (this._contextMatches(context)) {
        this._provider.setValue(undefined);
      }
    }
  };
}
