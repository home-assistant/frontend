import { LitElement, PropertyValues } from "lit";
import { property } from "lit/decorators";
import { computeLocalize, LocalizeFunc } from "../common/translations/localize";
import { Constructor, Resources } from "../types";
import { getLocalLanguage, getTranslation } from "../util/common-translation";
import { translationMetadata } from "../resources/translations-metadata";
import { computeDirectionStyles } from "../common/util/compute_rtl";

const empty = () => "";

export const litLocalizeLiteMixin = <T extends Constructor<LitElement>>(
  superClass: T
) => {
  class LitLocalizeLiteClass extends superClass {
    // Initialized to empty will prevent undefined errors if called before connected to DOM.
    @property() public localize: LocalizeFunc = empty;

    @property() public resources?: Resources;

    // Use browser language setup before login.
    @property() public language?: string = getLocalLanguage();

    @property() public translationFragment?: string;

    public connectedCallback(): void {
      super.connectedCallback();
      this._initializeLocalizeLite();
    }

    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      computeDirectionStyles(
        translationMetadata.translations[this.language!].isRTL,
        this
      );
    }

    protected updated(changedProperties: PropertyValues) {
      super.updated(changedProperties);
      if (changedProperties.get("translationFragment")) {
        this._initializeLocalizeLite();
      }

      if (
        this.language &&
        this.resources &&
        (changedProperties.has("language") ||
          changedProperties.has("resources"))
      ) {
        computeLocalize(
          this.constructor.prototype,
          this.language,
          this.resources
        ).then((localize) => {
          this.localize = localize;
        });
      }
    }

    protected async _initializeLocalizeLite() {
      if (this.resources) {
        return;
      }

      if (!this.translationFragment) {
        // In dev mode, we will issue a warning if after a second we are still
        // not configured correctly.
        if (__DEV__) {
          setTimeout(
            () =>
              !this.resources &&
              // eslint-disable-next-line
              console.error(
                "Forgot to pass in resources or set translationFragment for",
                this.nodeName
              ),
            1000
          );
        }
        return;
      }

      const { language, data } = await getTranslation(
        this.translationFragment!,
        this.language!
      );
      this.resources = {
        [language]: data,
      };
    }
  }
  return LitLocalizeLiteClass;
};
