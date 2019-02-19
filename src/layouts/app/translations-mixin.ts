import { translationMetadata } from "../../resources/translations-metadata";
import { getTranslation, getLocalLanguage } from "../../util/hass-translation";
import { Constructor, LitElement } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import { computeLocalize } from "../../common/translations/localize";
import { computeRTL } from "../../common/util/compute_rtl";
import { HomeAssistant } from "../../types";
import { saveFrontendUserData } from "../../data/frontend";

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
      // load default language resource
      this._loadResources(this.hass);
    }

    protected hassConnected() {
      super.hassConnected();
      // user may have different language setting, reload resource
      this.style.direction = computeRTL(this.hass!) ? "rtl" : "ltr";
      this._loadResources(this.hass!);
      this._loadBackendTranslations();
      this._loadTranslationFragment(this.hass!.panelUrl);
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

      const language = hass.language;

      const { resources } = await hass.callWS({
        type: "frontend/get_translations",
        language,
      });

      // Ignore the repsonse if user switched languages before we got response
      if (hass.language !== language) {
        return;
      }

      this._updateResources(language, resources);
    }

    private _loadTranslationFragment(panelUrl) {
      if (translationMetadata.fragments.includes(panelUrl)) {
        this._loadResources(this.hass, panelUrl);
      }
    }

    private async _loadResources(hass?, fragment?) {
      const result = await getTranslation(
        fragment,
        hass ? hass.language : getLocalLanguage()
      );
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
      this._updateHass({ language });
      if (event.detail.save) {
        saveFrontendUserData(this.hass!, "language", language);
      }
      this.style.direction = computeRTL(this.hass!) ? "rtl" : "ltr";
      this._loadResources(this.hass!);
      this._loadBackendTranslations();
      this._loadTranslationFragment(this.hass!.panelUrl);
    }
  };
