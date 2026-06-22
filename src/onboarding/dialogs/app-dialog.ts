import { LitElement, css, html, nothing } from "lit";
import { customElement } from "lit/decorators";
import "../../components/ha-dialog";
import { DialogMixin } from "../../dialogs/dialog-mixin";
import type { AppDialogParams } from "./show-app-dialog";

@customElement("app-dialog")
class DialogApp extends DialogMixin<AppDialogParams>(LitElement) {
  protected render() {
    if (!this.params?.localize) {
      return nothing;
    }
    return html`<ha-dialog
      open
      header-title=${this.params.localize(
        "ui.panel.page-onboarding.welcome.download_app"
      ) || "Click here to download the app"}
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
              alt=${this.params.localize(
                "ui.panel.page-onboarding.welcome.appstore"
              )}
              class="icon"
            />
            <img
              loading="lazy"
              src="/static/images/qr-appstore.svg"
              alt=${this.params.localize(
                "ui.panel.page-onboarding.welcome.appstore"
              )}
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
              alt=${this.params.localize(
                "ui.panel.page-onboarding.welcome.playstore"
              )}
              class="icon"
            />
            <img
              loading="lazy"
              src="/static/images/qr-playstore.svg"
              alt=${this.params.localize(
                "ui.panel.page-onboarding.welcome.playstore"
              )}
            />
          </a>
        </div>
      </div>
    </ha-dialog>`;
  }

  static styles = css`
    .app-qr {
      display: flex;
      justify-content: space-between;
      box-sizing: border-box;
      gap: 32px;
      width: 100%;
    }
    .app-qr a,
    .app-qr img {
      flex: 1;
      max-width: 180px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "app-dialog": DialogApp;
  }
}
