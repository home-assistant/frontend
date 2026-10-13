import { ContextProvider } from "@lit/context";
import type { LitElement, PropertyValues } from "lit";
import { buildLiteInternationalization } from "../common/translations/lite-internationalization";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  internationalizationContext,
  localeContext,
  localizeContext,
} from "../data/context";
import type { Constructor } from "../types";

interface LiteLocalizeElement {
  localize?: LocalizeFunc<any>;
  language?: string;
}

/**
 * Provides the i18n contexts from the "lite" localize state, so
 * context-consuming components work on pre-login roots that have no `hass`.
 */
export const provideLiteI18nMixin = <
  T extends Constructor<LitElement & LiteLocalizeElement>,
>(
  superClass: T
) =>
  class extends superClass {
    private __i18nProvider = new ContextProvider(this, {
      context: internationalizationContext,
    });

    private __localizeProvider = new ContextProvider(this, {
      context: localizeContext,
    });

    private __localeProvider = new ContextProvider(this, {
      context: localeContext,
    });

    protected willUpdate(changedProperties: PropertyValues): void {
      super.willUpdate(changedProperties);

      if (
        this.localize &&
        this.language &&
        (changedProperties.has("localize") || changedProperties.has("language"))
      ) {
        const value = buildLiteInternationalization(
          this.language,
          this.localize
        );
        this.__i18nProvider.setValue(value);
        this.__localizeProvider.setValue(value.localize);
        this.__localeProvider.setValue(value.locale);
      }
    }
  };
