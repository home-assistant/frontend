import "../../components/ha-analytics";
import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import { Analytics, setAnalyticsPreferences } from "../../data/analytics";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { DialogAnalyticsOptInParams } from "./show-dialog-analytics-optin";

@customElement("dialog-analytics-optin")
class DialogAnalyticsOptIn extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _error?: string;

  @internalProperty() private _submitting = false;

  @internalProperty() private _showPreferences = false;

  @internalProperty() private _analyticsDetails?: Analytics;

  public async showDialog(params: DialogAnalyticsOptInParams): Promise<void> {
    this._error = undefined;
    this._submitting = false;
    this._analyticsDetails = params.analytics;
  }

  public closeDialog(): void {
    this._error = undefined;
    this._submitting = false;
    this._showPreferences = false;
    this._analyticsDetails = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._analyticsDetails) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        heading="Analytics"
        scrimClickAction
        escapeKeyAction
        hideActions
      >
        <div class="content">
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${this._showPreferences
            ? html`<ha-analytics
                @analytics-preferences-changed=${this._preferencesChanged}
                .hass=${this.hass}
                .analytics=${this._analyticsDetails!}
              ></ha-analytics>`
            : html` <div class="introduction">
                To help us better understand how you use Home Assistant, and to
                ensure our priorities align with yours. We ask that you share
                your installation information to help make Home Assistant better
                and help us convince manufacturers to add local control and
                privacy-focused features.
                <p>
                  If you want to change what you share, you can find this in
                  under "General" here in the configuration panel
                </p>
              </div>`}
        </div>
        <div class="dialog-actions">
          <mwc-button @click=${this._ignore} .disabled=${this._submitting}>
            Ignore
          </mwc-button>
          <mwc-button
            @click=${this._customize}
            .disabled=${this._submitting || this._showPreferences}
          >
            Customize
          </mwc-button>
          <mwc-button @click=${this._submit} .disabled=${this._submitting}>
            ${this._showPreferences ? "Submit" : "Enable analytics"}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _preferencesChanged(event: CustomEvent): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
  }

  private async _ignore() {
    this._submitting = true;
    try {
      await setAnalyticsPreferences(this.hass, {});
    } catch (err) {
      this._error = err.message;
      this._submitting = false;
      return;
    }
    this.closeDialog();
  }

  private async _customize() {
    this._showPreferences = true;
  }

  private async _submit() {
    this._submitting = true;
    try {
      await setAnalyticsPreferences(
        this.hass,
        this._showPreferences
          ? this._analyticsDetails!.preferences
          : { base: true, usage: true, statistics: true }
      );
    } catch (err) {
      this._error = err.message;
      this._submitting = false;
      return;
    }

    this.closeDialog();
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .error {
          color: var(--error-color);
        }
        .content {
          padding-bottom: 54px;
        }
        .dialog-actions {
          display: flex;
          justify-content: space-between;
          bottom: 16px;
          position: absolute;
          width: calc(100% - 48px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-analytics-optin": DialogAnalyticsOptIn;
  }
}
