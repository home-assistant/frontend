import { atLeastVersion } from "../common/config/version";
import { computeLocalize, LocalizeFunc } from "../common/translations/localize";
import { computeRTL } from "../common/util/compute_rtl";
import { debounce } from "../common/util/debounce";
import {
  getHassTranslations,
  getHassTranslationsPre109,
  saveTranslationPreferences,
  TranslationCategory,
} from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import {
  getLocalLanguage,
  getTranslation,
  getUserLanguage,
} from "../util/hass-translation";
import { HassBaseEl } from "./hass-base-mixin";

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

    private __loadedTranslations: {
      // track what things have been loaded
      [category: string]: LoadedTranslationCategory;
    } = {};

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-language-select", (e) =>
        this._selectLanguage((e as CustomEvent).detail.language, true)
      );
      this._loadCoreTranslations(getLocalLanguage());
    }

    protected hassConnected() {
      super.hassConnected();
      getUserLanguage(this.hass!).then((language) => {
        if (language && this.hass!.language !== language) {
          // We just get language from backend, no need to save back
          this._selectLanguage(language, false);
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

    protected panelUrlChanged(newPanelUrl) {
      super.panelUrlChanged(newPanelUrl);
      // this may be triggered before hassConnected
      this._loadFragmentTranslations(
        this.hass ? this.hass.language : getLocalLanguage(),
        newPanelUrl
      );
    }

    private _selectLanguage(language: string, saveToBackend: boolean) {
      if (!this.hass) {
        // should not happen, do it to avoid use this.hass!
        return;
      }

      // update selectedLanguage so that it can be saved to local storage
      this._updateHass({ language, selectedLanguage: language });
      storeState(this.hass);
      if (saveToBackend) {
        saveTranslationPreferences(this.hass, { language });
      }
      this._applyTranslations(this.hass);
      this._refetchCachedHassTranslations(true, true);
    }

    private _applyTranslations(hass: HomeAssistant) {
      document.querySelector("html")!.setAttribute("lang", hass.language);
      this.style.direction = computeRTL(hass) ? "rtl" : "ltr";
      this._loadCoreTranslations(hass.language);
      this._loadFragmentTranslations(hass.language, hass.panelUrl);
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

        this._updateResources(language, resources);
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

      // Check if already loaded
      if (!force) {
        if (integration) {
          if (alreadyLoaded.integrations.includes(integration)) {
            return this.hass!.localize;
          }
        } else if (
          configFlow ? alreadyLoaded.configFlow : alreadyLoaded.setup
        ) {
          return this.hass!.localize;
        }
      }

      // Add to cache
      if (integration) {
        if (!alreadyLoaded.integrations.includes(integration)) {
          alreadyLoaded.integrations.push(integration);
        }
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
        integration,
        configFlow
      );

      // Ignore the repsonse if user switched languages before we got response
      if (this.hass!.language !== language) {
        return this.hass!.localize;
      }

      this._updateResources(language, resources);
      return this.hass!.localize;
    }

    private async _loadFragmentTranslations(
      language: string,
      panelUrl: string
    ) {
      if (translationMetadata.fragments.includes(panelUrl)) {
        const result = await getTranslation(panelUrl, language);
        this._updateResources(result.language, result.data);
      }
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
        this._updateResources(result.language, result.data);
      } finally {
        this.__coreProgress = undefined;
      }
    }

    private _updateResources(language: string, data: any) {
      // Update the language in hass, and update the resources with the newly
      // loaded resources. This merges the new data on top of the old data for
      // this language, so that the full translation set can be loaded across
      // multiple fragments.
      const resources = {
        [language]: {
          ...this.hass?.resources?.[language],
          ...data,
        },
      };
      const changes: Partial<HomeAssistant> = { resources };
      if (this.hass && language === this.hass.language) {
        changes.localize = computeLocalize(this, language, resources);
      }
      this._updateHass(changes);
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
