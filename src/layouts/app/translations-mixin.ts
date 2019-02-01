import { translationMetadata } from "../../resources/translations-metadata";
import { getTranslation } from "../../util/hass-translation";
import { storeState } from "../../util/ha-pref-storage";
import { Constructor, LitElement } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import { computeLocalize } from "../../common/translations/localize";
import { computeRTL } from "../../common/util/compute_rtl";
import { HomeAssistant } from "../../types";

/*
 * superClass needs to contain `this.hass` and `this._updateHass`.
 */

export default (superClass: Constructor<LitElement & HassBaseEl>) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-language-select", (e) =>
        this._selectLanguage(e)
      );
      this._loadResources();
    }

    protected hassConnected() {
      super.hassConnected();
      this._loadBackendTranslations();
      this.style.direction = computeRTL(this.hass!) ? "rtl" : "ltr";
    }

    protected hassReconnected() {
      super.hassReconnected();
      this._loadBackendTranslations();
    }

    protected panelUrlChanged(newPanelUrl) {
      super.panelUrlChanged(newPanelUrl);
      this._loadTranslationFragment(newPanelUrl);
    }

    private async _loadBackendTranslations() {
      const hass = this.hass;
      if (!hass || !hass.language) {
        return;
      }

      const language = hass.selectedLanguage || hass.language;

      const { resources } = await hass.callWS({
        type: "frontend/get_translations",
        language,
      });

      // If we've switched selected languages just ignore this response
      if ((hass.selectedLanguage || hass.language) !== language) {
        return;
      }

      this._updateResources(language, resources);
    }

    private _loadTranslationFragment(panelUrl) {
      if (translationMetadata.fragments.includes(panelUrl)) {
        this._loadResources(panelUrl);
      }
    }

    private async _loadResources(fragment?) {
      const result = await getTranslation(fragment);
      this._updateResources(result.language, result.data);
    }

    private _updateResources(language, data) {
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
      if (language === this.hass!.language) {
        changes.localize = computeLocalize(this, language, resources);
      }
      this._updateHass(changes);
    }

    private _selectLanguage(event) {
      const language: string = event.detail.language;
      this._updateHass({ language, selectedLanguage: language });
      this.style.direction = computeRTL(this.hass!) ? "rtl" : "ltr";
      storeState(this.hass);
      this._loadResources();
      this._loadBackendTranslations();
      this._loadTranslationFragment(this.hass!.panelUrl);
    }
  };
