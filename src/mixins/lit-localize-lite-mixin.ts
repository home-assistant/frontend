import {
  Constructor,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { HomeAssistant } from "../types";
import { getActiveTranslation } from "../util/hass-translation";
import { LocalizeFunc, LocalizeMixin } from "./localize-base-mixin";
import { localizeLiteBaseMixin } from "./localize-lite-base-mixin";

const empty = () => "";

interface LitLocalizeLiteMixin {
  language: string;
  resources: {};
  translationFragment: string;
}

export const litLocalizeLiteMixin = <T extends LitElement>(
  superClass: Constructor<T>
): Constructor<T & LocalizeMixin & LitLocalizeLiteMixin> =>
  // @ts-ignore
  class extends localizeLiteBaseMixin(superClass) {
    protected hass?: HomeAssistant;
    protected localize!: LocalizeFunc;

    static get properties(): PropertyDeclarations {
      return {
        hass: {},
        localize: {},
        language: {},
        resources: {},
        translationFragment: {},
      };
    }

    constructor() {
      super();
      // This will prevent undefined errors if called before connected to DOM.
      this.localize = empty;
      this.language = getActiveTranslation();
    }

    public connectedCallback(): void {
      super.connectedCallback();
      this._initializeLocalizeLite();
      this.localize = this.__computeLocalize(this.language, this.resources);
    }

    public updated(changedProperties: PropertyValues) {
      super.updated(changedProperties);
      if (
        changedProperties.has("language") ||
        changedProperties.has("resources")
      ) {
        this.localize = this.__computeLocalize(this.language, this.resources);
      }
    }
  };
