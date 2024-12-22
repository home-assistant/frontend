import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { LocalizeFunc } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";

@customElement("app-dialog")
class DialogApp extends LitElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  public async showDialog(params): Promise<void> {
    this.localize = params.localize;
  }

  public async closeDialog(): Promise<void> {
    this.localize = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this.localize) {
      return nothing;
    }
    return html`<ha-dialog
      open
      hideActions
      @closed=${this.closeDialog}
      .heading=${createCloseHeading(
        undefined,
        this.localize("ui.panel.page-onboarding.welcome.download_app") ||
          "Click here to download the app"
      )}
    >
      <div>
        <div class="app-qr">
          <a
            target="_blank"
            rel="noreferrer noopener"
            href="https://apps.apple.com/app/home-assistant/id1099568401?mt=8"
          >
            <img
              loading="lazy"
              src="/static/images/appstore.svg"
              alt=${this.localize("ui.panel.page-onboarding.welcome.appstore")}
              class="icon"
            />
            <img
              loading="lazy"
              src="/static/images/qr-appstore.svg"
              alt=${this.localize("ui.panel.page-onboarding.welcome.appstore")}
            />
          </a>
          <a
            target="_blank"
            rel="noreferrer noopener"
            href="https://play.google.com/store/apps/details?id=io.homeassistant.companion.android"
          >
            <img
              loading="lazy"
              src="/static/images/playstore.svg"
              alt=${this.localize("ui.panel.page-onboarding.welcome.playstore")}
              class="icon"
            />
            <img
              loading="lazy"
              src="/static/images/qr-playstore.svg"
              alt=${this.localize("ui.panel.page-onboarding.welcome.playstore")}
            />
          </a>
        </div>
      </div>
    </ha-dialog>`;
  }

  static styles = css`
    ha-dialog {
      --mdc-dialog-min-width: min(500px, 90vw);
    }
    .app-qr {
      margin: 24px auto 0 auto;
      display: flex;
      justify-content: space-between;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 16px;
      width: 100%;
      max-width: 400px;
    }
    .app-qr a,
    .app-qr img {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "app-dialog": DialogApp;
  }
}
