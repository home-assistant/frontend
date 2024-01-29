import "@material/mwc-list";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-icon-next";
import "../components/ha-list-item";
import { AuthProvider } from "../data/auth";

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-auth-provider": HaPickAuthProvider;
  }
  interface HASSDomEvents {
    "pick-auth-provider": AuthProvider;
  }
}

@customElement("ha-pick-auth-provider")
export class HaPickAuthProvider extends LitElement {
  @property({ attribute: false }) public authProviders: AuthProvider[] = [];

  @property({ attribute: false }) public localize!: LocalizeFunc;

  protected render() {
    return html`
      <h3>
        <span
          >${this.localize("ui.panel.page-authorize.pick_auth_provider")}</span
        >
      </h3>
      <mwc-list>
        ${this.authProviders.map(
          (provider) => html`
            <ha-list-item
              hasMeta
              role="button"
              .auth_provider=${provider}
              @click=${this._handlePick}
            >
              ${provider.name}
              <ha-icon-next slot="meta"></ha-icon-next>
            </ha-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _handlePick(ev) {
    fireEvent(this, "pick-auth-provider", ev.currentTarget.auth_provider);
  }

  static styles = css`
    h3 {
      margin: 0 -16px;
      position: relative;
      z-index: 1;
      text-align: center;
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
    }
    h3:before {
      border-top: 1px solid var(--divider-color);
      content: "";
      margin: 0 auto;
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      z-index: -1;
    }
    h3 span {
      background: var(--card-background-color);
      padding: 0 15px;
    }
    mwc-list {
      margin: 16px -16px 0;
      --mdc-list-side-padding: 24px;
    }
  `;
}
