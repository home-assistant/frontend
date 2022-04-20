import "@material/mwc-list/mwc-list-item";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { HomeAssistant, Translation } from "../../types";

@customElement("ha-pick-language-row")
export class HaPickLanguageRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @state() private _languages: (Translation & { key: string })[] = [];

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._computeLanguages();
  }

  protected render() {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading"
          >${this.hass.localize("ui.panel.profile.language.header")}</span
        >
        <span slot="description">
          <a
            href="https://developers.home-assistant.io/docs/en/internationalization_translation.html"
            target="_blank"
            rel="noreferrer"
            >${this.hass.localize("ui.panel.profile.language.link_promo")}</a
          >
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.language.dropdown_label"
          )}
          .value=${this.hass.locale.language}
          @selected=${this._languageSelectionChanged}
        >
          ${this._languages.map(
            (language) => html`<mwc-list-item
              .value=${language.key}
              rtl=${language.isRTL}
            >
              ${language.nativeName}
            </mwc-list-item>`
          )}
        </ha-select>
      </ha-settings-row>
    `;
  }

  private _computeLanguages() {
    if (!this.hass.translationMetadata?.translations) {
      return;
    }
    this._languages = Object.keys(
      this.hass.translationMetadata.translations
    ).map((key) => ({
      key,
      ...this.hass.translationMetadata.translations[key],
    }));
  }

  private _languageSelectionChanged(ev) {
    // Only fire event if language was changed. This prevents select updates when
    // responding to hass changes.
    if (ev.target.value !== this.hass.language) {
      fireEvent(this, "hass-language-select", ev.target.value);
    }
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-language-row": HaPickLanguageRow;
  }
}
