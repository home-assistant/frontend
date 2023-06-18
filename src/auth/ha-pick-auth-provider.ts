import "@material/mwc-list";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-icon-next";
import "../components/ha-list-item";
import { AuthProvider } from "../data/auth";

declare global {
  interface HASSDomEvents {
    "pick-auth-provider": AuthProvider;
  }
}

@customElement("ha-pick-auth-provider")
export class HaPickAuthProvider extends LitElement {
  @property() public authProviders: AuthProvider[] = [];

  @property() public localize!: LocalizeFunc;

  protected render() {
    return html`
      <p>${this.localize("ui.panel.page-authorize.pick_auth_provider")}:</p>
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
        )}</mwc-list
      >
    `;
  }

  private _handlePick(ev) {
    fireEvent(this, "pick-auth-provider", ev.currentTarget.auth_provider);
  }

  static styles = css`
    p {
      margin-top: 0;
    }
    mwc-list {
      margin: 0 -16px;
      --mdc-list-side-padding: 16px;
    }
  `;
}
