import { atLeastVersion } from "../common/config/version";
import { computeLocalize, LocalizeFunc } from "../common/translations/localize";
import {
  computeRTLDirection,
  setDirectionStyles,
} from "../common/util/compute_rtl";
import { debounce } from "../common/util/debounce";
import {
  Weekday,
  getHassTranslations,
  getHassTranslationsPre109,
  NumberFormat,
  saveTranslationPreferences,
  TimeFormat,
  TranslationCategory,
} from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import {
  getLocalLanguage,
  getTranslation,
  getUserLocale,
} from "../util/common-translation";
import { HassBaseEl } from "./hass-base-mixin";
import { fireEvent } from "../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-language-select": {
      language: string;
    };
    "hass-number-format-select": {
      number_format: NumberFormat;
    };
    "hass-time-format-select": {
      time_format: TimeFormat;
    };
    "hass-first-weekday-select": {
      first_weekday: TimeFormat;
    };
    "translations-updated": undefined;
  }
}

interface LoadedTranslationCategory {
  // individual integrations loaded for this category
  integrations: string[];
  // if integrations that have been set up for this category are loaded
  setup: boolean;
  // if
  configFlow: boolean;
}

/*
 * superClass needs to contain `this.hass` and `this._updateHass`.
 */

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    // eslint-disable-next-line: variable-name
    private __coreProgress?: string;

    private __loadedFragmetTranslations: Set<string> = new Set();

    private __loadedTranslations: {
      // track what things have been loaded
      [category: string]: LoadedTranslationCategory;
    } = {};

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-language-select", (e) => {
        this._selectLanguage((e as CustomEvent).detail, true);
      });
      this.addEventListener("hass-number-format-select", (e) => {
        this._selectNumberFormat((e as CustomEvent).detail, true);
      });
      this.addEventListener("hass-time-format-select", (e) => {
        this._selectTimeFormat((e as CustomEvent).detail, true);
      });
      this.addEventListener("hass-first-weekday-select", (e) => {
        this._selectFirstWeekday((e as CustomEvent).detail, true);
      });
      this._loadCoreTranslations(getLocalLanguage());
    }

    protected updated(changedProps) {
      super.updated(changedProps);
      if (!changedProps.has("hass")) {
        return;
      }
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (
        this.hass?.panels &&
        (!oldHass || oldHass.panels !== this.hass.panels)
      ) {
        this._loadFragmentTranslations(this.hass.language, this.hass.panelUrl);
      }
    }

    protected hassConnected() {
      super.hassConnected();
      getUserLocale(this.hass!).then((locale) => {
        if (locale?.language && this.hass!.language !== locale.language) {
          // We just got language from backend, no need to save back
          this._selectLanguage(locale.language, false);
        }
        if (
          locale?.number_format &&
          this.hass!.locale.number_format !== locale.number_format
        ) {
          // We just got number_format from backend, no need to save back
          this._selectNumberFormat(locale.number_format, false);
        }
        if (
          locale?.time_format &&
          this.hass!.locale.time_format !== locale.time_format
        ) {
          // We just got time_format from backend, no need to save back
          this._selectTimeFormat(locale.time_format, false);
        }
        if (
          locale?.first_weekday &&
          this.hass!.locale.first_weekday !== locale.first_weekday
        ) {
          // We just got first_weekday from backend, no need to save back
          this._selectFirstWeekday(locale.first_weekday, false);
        }
      });

      this.hass!.connection.subscribeEvents(
        debounce(() => {
          this._refetchCachedHassTranslations(false, false);
        }, 500),
        "component_loaded"
      );
      this._applyTranslations(this.hass!);
    }

    protected hassReconnected() {
      super.hassReconnected();
      this._refetchCachedHassTranslations(true, false);
      this._applyTranslations(this.hass!);
    }

    protected panelUrlChanged(newPanelUrl: string) {
      super.panelUrlChanged(newPanelUrl);
      // this may be triggered before hassConnected
      this._loadFragmentTranslations(
        this.hass ? this.hass.language : getLocalLanguage(),
        newPanelUrl
      );
    }

    private _selectNumberFormat(
      number_format: NumberFormat,
      saveToBackend: boolean
    ) {
      this._updateHass({
        locale: { ...this.hass!.locale, number_format: number_format },
      });
      if (saveToBackend) {
        saveTranslationPreferences(this.hass!, this.hass!.locale);
      }
    }

    private _selectTimeFormat(time_format: TimeFormat, saveToBackend: boolean) {
      this._updateHass({
        locale: { ...this.hass!.locale, time_format: time_format },
      });
      if (saveToBackend) {
        saveTranslationPreferences(this.hass!, this.hass!.locale);
      }
    }

    private _selectFirstWeekday(
      first_weekday: Weekday,
      saveToBackend: boolean
    ) {
      this._updateHass({
        locale: { ...this.hass!.locale, first_weekday: first_weekday },
      });
      if (saveToBackend) {
        saveTranslationPreferences(this.hass!, this.hass!.locale);
      }
    }

    private _selectLanguage(language: string, saveToBackend: boolean) {
      if (!this.hass) {
        // should not happen, do it to avoid use this.hass!
        return;
      }

      // update selectedLanguage so that it can be saved to local storage
      this._updateHass({
        locale: { ...this.hass!.locale, language: language },
        language: language,
        selectedLanguage: language,
      });
      storeState(this.hass);
      if (saveToBackend) {
        saveTranslationPreferences(this.hass, this.hass.locale);
      }
      this._applyTranslations(this.hass);
      this._refetchCachedHassTranslations(true, true);
    }

    private _applyTranslations(hass: HomeAssistant) {
      document.querySelector("html")!.setAttribute("lang", hass.language);
      this._applyDirection(hass);
      this._loadCoreTranslations(hass.language);
      this.__loadedFragmetTranslations = new Set();
      this._loadFragmentTranslations(hass.language, hass.panelUrl);
    }

    private _applyDirection(hass: HomeAssistant) {
      const direction = computeRTLDirection(hass);
      document.dir = direction;
      setDirectionStyles(direction, this);
    }

    /**
     * Load translations from the backend
     * @param language language to fetch
     * @param category category to fetch
     * @param integration optional, if having to fetch for specific integration
     * @param configFlow optional, if having to fetch for all integrations with a config flow
     * @param force optional, load even if already cached
     */
    private async _loadHassTranslations(
      language: string,
      category: Parameters<typeof getHassTranslations>[2],
      integration?: Parameters<typeof getHassTranslations>[3],
      configFlow?: Parameters<typeof getHassTranslations>[4],
      force = false
    ): Promise<LocalizeFunc> {
      if (
        __BACKWARDS_COMPAT__ &&
        !atLeastVersion(this.hass!.connection.haVersion, 0, 109)
      ) {
        if (category !== "state") {
          return this.hass!.localize;
        }
        const resources = await getHassTranslationsPre109(this.hass!, language);

        // Ignore the repsonse if user switched languages before we got response
        if (this.hass!.language !== language) {
          return this.hass!.localize;
        }

        await this._updateResources(language, resources);
        return this.hass!.localize;
      }

      let alreadyLoaded: LoadedTranslationCategory;

      if (category in this.__loadedTranslations) {
        alreadyLoaded = this.__loadedTranslations[category];
      } else {
        alreadyLoaded = this.__loadedTranslations[category] = {
          integrations: [],
          setup: false,
          configFlow: false,
        };
      }

      let integrationsToLoad: string[] = [];

      // Check if already loaded
      if (!force) {
        if (integration && Array.isArray(integration)) {
          integrationsToLoad = integration.filter(
            (i) => !alreadyLoaded.integrations.includes(i)
          );
          if (!integrationsToLoad.length) {
            return this.hass!.localize;
          }
        } else if (integration) {
          if (alreadyLoaded.integrations.includes(integration)) {
            return this.hass!.localize;
          }
          integrationsToLoad = [integration];
        } else if (
          configFlow ? alreadyLoaded.configFlow : alreadyLoaded.setup
        ) {
          return this.hass!.localize;
        }
      }

      // Add to cache
      if (integrationsToLoad.length) {
        alreadyLoaded.integrations.push(...integrationsToLoad);
      } else {
        alreadyLoaded.setup = true;
        if (configFlow) {
          alreadyLoaded.configFlow = true;
        }
      }

      const resources = await getHassTranslations(
        this.hass!,
        language,
        category,
        integrationsToLoad.length ? integrationsToLoad : undefined,
        configFlow
      );

      // Ignore the repsonse if user switched languages before we got response
      if (this.hass!.language !== language) {
        return this.hass!.localize;
      }

      await this._updateResources(language, resources);
      return this.hass!.localize;
    }

    private async _loadFragmentTranslations(
      language: string,
      panelUrl: string
    ) {
      if (!panelUrl) {
        return undefined;
      }

      const panelComponent = this.hass?.panels?.[panelUrl]?.component_name;

      // If it's the first call we don't have panel info yet to check the component.
      const fragment = translationMetadata.fragments.includes(
        panelComponent || panelUrl
      )
        ? panelComponent || panelUrl
        : undefined;

      if (!fragment) {
        return undefined;
      }

      if (this.__loadedFragmetTranslations.has(fragment)) {
        return this.hass!.localize;
      }
      this.__loadedFragmetTranslations.add(fragment);
      const result = await getTranslation(fragment, language);
      await this._updateResources(result.language, result.data);
      return this.hass!.localize;
    }

    private async _loadCoreTranslations(language: string) {
      // Check if already in progress
      // Necessary as we call this in firstUpdated and hassConnected
      if (this.__coreProgress === language) {
        return;
      }
      this.__coreProgress = language;
      try {
        const result = await getTranslation(null, language);
        await this._updateResources(result.language, result.data);
      } finally {
        this.__coreProgress = undefined;
      }
    }

    private async _updateResources(language: string, data: any) {
      // Update the language in hass, and update the resources with the newly
      // loaded resources. This merges the new data on top of the old data for
      // this language, so that the full translation set can be loaded across
      // multiple fragments.
      //
      // Beware of a subtle race condition: it is possible to get here twice
      // before this.hass is even created. In this case our base state comes
      // from this._pendingHass instead. Otherwise the first set of strings is
      // overwritten when we call _updateHass the second time!

      // Allow hass to be updated
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (language !== (this.hass ?? this._pendingHass).language) {
        // the language was changed, abort
        return;
      }

      const resources = {
        [language]: {
          ...(this.hass ?? this._pendingHass)?.resources?.[language],
          ...data,
        },
      };

      // Update resources immediately, so when a new update comes in we don't miss values
      this._updateHass({ resources });

      const localize = await computeLocalize(this, language, resources);

      if (language === (this.hass ?? this._pendingHass).language) {
        this._updateHass({
          localize,
        });
      }
      fireEvent(this, "translations-updated");
    }

    private _refetchCachedHassTranslations(
      includeConfigFlow: boolean,
      clearIntegrations: boolean
    ) {
      for (const [category, cache] of Object.entries(
        this.__loadedTranslations
      )) {
        if (clearIntegrations) {
          cache.integrations = [];
        }
        if (cache.setup) {
          this._loadHassTranslations(
            this.hass!.language,
            category as TranslationCategory,
            undefined,
            includeConfigFlow && cache.configFlow,
            true
          );
        }
      }
    }
  };

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
getTranslation(null, getLocalLanguage());
