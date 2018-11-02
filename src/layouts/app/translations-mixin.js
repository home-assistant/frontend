import translationMetadata from "../../../build-translations/translationMetadata.json";
import { getTranslation } from "../../util/hass-translation";

import { storeState } from "../../util/ha-pref-storage";

/*
 * superClass needs to contain `this.hass` and `this._updateHass`.
 */

export default (superClass) =>
  class extends superClass {
    ready() {
      super.ready();
      this.addEventListener("hass-language-select", (e) =>
        this._selectLanguage(e)
      );
      this._loadResources();
    }

    hassConnected() {
      super.hassConnected();
      this._loadBackendTranslations();
    }

    hassReconnected() {
      super.hassReconnected();
      this._loadBackendTranslations();
    }

    panelUrlChanged(newPanelUrl) {
      super.panelUrlChanged(newPanelUrl);
      this._loadTranslationFragment(newPanelUrl);
    }

    async _loadBackendTranslations() {
      if (!this.hass.language) return;

      const language = this.hass.selectedLanguage || this.hass.language;

      const { resources } = await this.hass.callWS({
        type: "frontend/get_translations",
        language,
      });

      // If we've switched selected languages just ignore this response
      if ((this.hass.selectedLanguage || this.hass.language) !== language)
        return;

      this._updateResources(language, resources);
    }

    _loadTranslationFragment(panelUrl) {
      if (translationMetadata.fragments.includes(panelUrl)) {
        this._loadResources(panelUrl);
      }
    }

    async _loadResources(fragment) {
      const result = await getTranslation(fragment);
      this._updateResources(result.language, result.data);
    }

    _updateResources(language, data) {
      // Update the language in hass, and update the resources with the newly
      // loaded resources. This merges the new data on top of the old data for
      // this language, so that the full translation set can be loaded across
      // multiple fragments.
      this._updateHass({
        language: language,
        resources: {
          [language]: Object.assign(
            {},
            this.hass && this.hass.resources && this.hass.resources[language],
            data
          ),
        },
      });
    }

    _selectLanguage(event) {
      this._updateHass({ selectedLanguage: event.detail.language });
      storeState(this.hass);
      this._loadResources();
      this._loadBackendTranslations();
      this._loadTranslationFragment(this.panelUrl);
    }
  };
