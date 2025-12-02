import type { PropertyValues } from "lit";
import { LitElement } from "lit";
import { property, state } from "lit/decorators";
import {
  computeLocalize,
  type LandingPageKeys,
  type LocalizeFunc,
} from "../../src/common/translations/localize";
import { computeDirectionStyles } from "../../src/common/util/compute_rtl";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { translationMetadata } from "../../src/resources/translations-metadata";
import type { HassBaseEl } from "../../src/state/hass-base-mixin";
import themesMixin from "../../src/state/themes-mixin";
import type { Constructor, Resources } from "../../src/types";
import {
  getLocalLanguage,
  getTranslation,
} from "../../src/util/common-translation";

export class LandingPageBaseElement extends themesMixin(
  ProvideHassLitMixin(LitElement) as unknown as Constructor<HassBaseEl>
) {
  // Initialized to empty will prevent undefined errors if called before connected to DOM.
  @property({ attribute: false })
  public localize?: LocalizeFunc<LandingPageKeys>;

  // Use browser language setup before login.
  @property() public language?: string = getLocalLanguage();

  @state() private _resources?: Resources;

  public connectedCallback(): void {
    super.connectedCallback();
    this._initializeLocalize();
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.get("language")) {
      this._resources = undefined;
      this._initializeLocalize();
    }

    if (
      this.language &&
      this._resources &&
      (changedProperties.has("language") || changedProperties.has("_resources"))
    ) {
      this._setLocalize();
    }
  }

  private async _initializeLocalize() {
    if (this._resources || !this.language) {
      return;
    }

    const { data } = await getTranslation(null, this.language);
    this._resources = {
      [this.language]: data,
    };
  }

  private async _setLocalize() {
    this.localize = await computeLocalize(
      this.constructor.prototype,
      this.language!,
      this._resources!
    );
    computeDirectionStyles(
      translationMetadata.translations[this.language!].isRTL,
      this
    );
  }
}
