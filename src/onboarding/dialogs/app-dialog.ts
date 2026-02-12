import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { LocalizeFunc } from "../../common/translations/localize";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-wa-dialog";

@customElement("app-dialog")
class DialogApp extends LitElement {
  @property({ attribute: false }) public localize?: LocalizeFunc;

  @state() private _open = false;

  public async showDialog(params: { localize: LocalizeFunc }): Promise<void> {
    this.localize = params.localize;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this.localize = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this.localize) {
      return nothing;
    }
    return html`<ha-wa-dialog
      .open=${this._open}
      header-title=${this.localize(
        "ui.panel.page-onboarding.welcome.download_app"
      ) || "Click here to download the app"}
      @closed=${this._dialogClosed}
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
    </ha-wa-dialog>`;
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
