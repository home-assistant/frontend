import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { LocalizeBaseMixin } from "./localize-base-mixin";

export const HassLocalizeLitMixin = dedupingMixin(
  (superClass) =>
    class extends LocalizeBaseMixin(superClass) {
      static get properties() {
        return {
          hass: {},
          localize: {},
        };
      }

      connectedCallback() {
        super.connectedCallback();

        let language;
        let resources;
        if (this.hass) {
          language = this.hass.language;
          resources = this.hass.resources;
        }
        this.localize = this.__computeLocalize(language, resources);
      }

      updated(changedProperties) {
        super.updated(changedProperties);

        if (!changedProperties.has("hass")) {
          return;
        }

        let oldLanguage;
        let oldResources;
        if (changedProperties.hass) {
          oldLanguage = changedProperties.hass.language;
          oldResources = changedProperties.hass.resources;
        }

        let language;
        let resources;
        if (this.hass) {
          language = this.hass.language;
          resources = this.hass.resources;
        }

        if (oldLanguage !== language || oldResources !== resources) {
          this.localize = this.__computeLocalize(language, resources);
        }
      }
    }
);
