import { translationMetadata } from "../resources/translations-metadata";
import {
  getTranslation,
  getLocalLanguage,
  getUserLanguage,
} from "../util/hass-translation";
import { HassBaseEl } from "./hass-base-mixin";
import { computeLocalize } from "../common/translations/localize";
import { computeRTL } from "../common/util/compute_rtl";
import { HomeAssistant, Constructor } from "../types";
import { storeState } from "../util/ha-pref-storage";
import {
  getHassTranslations,
  saveTranslationPreferences,
} from "../data/translation";

/*
 * superClass needs to contain `this.hass` and `this._updateHass`.
 */

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    // tslint:disable-next-line: variable-name
    private __coreProgress?: string;

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
      this._applyTranslations(this.hass!);
    }

    protected hassReconnected() {
      super.hassReconnected();
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
    }

    private _applyTranslations(hass: HomeAssistant) {
      this.style.direction = computeRTL(hass) ? "rtl" : "ltr";
      this._loadCoreTranslations(hass.language);
      this._loadHassTranslations(hass.language);
      this._loadFragmentTranslations(hass.language, hass.panelUrl);
    }

    private async _loadHassTranslations(language: string) {
      const resources = await getHassTranslations(this.hass!, language);

      // Ignore the repsonse if user switched languages before we got response
      if (this.hass!.language !== language) {
        return;
      }

      this._updateResources(language, resources);
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
          ...(this.hass &&
            this.hass.resources &&
            this.hass.resources[language]),
          ...data,
        },
      };
      const changes: Partial<HomeAssistant> = { resources };
      if (this.hass && language === this.hass.language) {
        changes.localize = computeLocalize(this, language, resources);
      }
      this._updateHass(changes);
    }
  };
