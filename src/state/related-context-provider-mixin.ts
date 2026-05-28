import { ContextProvider } from "@lit/context";
import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import { mainWindow } from "../common/dom/get_main_window";
import { buildRelatedIdSets } from "../common/search/related-context";
import { relatedContext, type RelatedContextItem } from "../data/context";
import { findRelated } from "../data/search";
import type { Constructor } from "../types";
import type { HassElement } from "./hass-element";

export const RelatedContextProviderMixin = <T extends Constructor<HassElement>>(
  superClass: T
) => {
  class RelatedContextProviderClass extends superClass {
    private _relatedContext?: RelatedContextItem;

    private _relatedContextProvider = new ContextProvider(this, {
      context: relatedContext,
    });

    private _fetchRelatedMemoized = memoizeOne(
      (itemType: RelatedContextItem["itemType"], itemId: string) =>
        findRelated(this.hass!, itemType, itemId)
    );

    private _clearRelatedContext = () => {
      this._relatedContext = undefined;
      this._relatedContextProvider.setValue(undefined);
    };

    private _contextMatches = (context?: RelatedContextItem) =>
      context?.itemType === this._relatedContext?.itemType &&
      context?.itemId === this._relatedContext?.itemId;

    private _resolveRelatedContext = async (context?: RelatedContextItem) => {
      this._relatedContextProvider.setValue(undefined);
      if (!context) {
        return;
      }

      try {
        const related = await this._fetchRelatedMemoized(
          context.itemType,
          context.itemId
        );
        if (this._contextMatches(context)) {
          this._relatedContextProvider.setValue(buildRelatedIdSets(related));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Error resolving related context", err);
        if (this._contextMatches(context)) {
          this._relatedContextProvider.setValue(undefined);
        }
      }
    };

    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);

      this.addEventListener("hass-related-context", (ev) => {
        this._relatedContext =
          ev.detail && "itemType" in ev.detail && "itemId" in ev.detail
            ? ev.detail
            : undefined;
        this._resolveRelatedContext(this._relatedContext);
      });

      mainWindow.addEventListener(
        "location-changed",
        this._clearRelatedContext
      );
      mainWindow.addEventListener("popstate", this._clearRelatedContext);
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      mainWindow.removeEventListener(
        "location-changed",
        this._clearRelatedContext
      );
      mainWindow.removeEventListener("popstate", this._clearRelatedContext);
    }
  }
  return RelatedContextProviderClass;
};
