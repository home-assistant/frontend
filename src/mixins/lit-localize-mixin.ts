import {
  Constructor,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { HomeAssistant } from "../types";
import {
  LocalizeBaseMixin,
  LocalizeFunc,
  LocalizeMixin,
} from "./localize-base-mixin";

const empty = () => "";

export const HassLocalizeLitMixin = <T extends LitElement>(
  superClass: Constructor<T>
): Constructor<T & LocalizeMixin> =>
  // @ts-ignore
  class extends LocalizeBaseMixin(superClass) {
    protected hass?: HomeAssistant;
    protected localize!: LocalizeFunc;

    static get properties(): PropertyDeclarations {
      return {
        hass: {},
        localize: {},
      };
    }

    constructor() {
      super();
      // This will prevent undefined errors if called before connected to DOM.
      this.localize = empty;
    }

    public connectedCallback(): void {
      super.connectedCallback();

      let language;
      let resources;
      if (this.hass) {
        language = this.hass.language;
        resources = this.hass.resources;
      }
      this.localize = this.__computeLocalize(language, resources);
    }

    public updated(changedProperties: PropertyValues) {
      super.updated(changedProperties);

      if (!changedProperties.has("hass")) {
        return;
      }

      let oldLanguage;
      let oldResources;
      const hass = changedProperties.get("hass") as HomeAssistant;
      if (hass) {
        oldLanguage = hass.language;
        oldResources = hass.resources;
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
  };
