import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "../components/ha-icon-next";
import { AuthProvider } from "../data/auth";
import { litLocalizeLiteMixin } from "../mixins/lit-localize-lite-mixin";

declare global {
  interface HASSDomEvents {
    "pick-auth-provider": AuthProvider;
  }
}

class HaPickAuthProvider extends litLocalizeLiteMixin(LitElement) {
  @property() public authProviders: AuthProvider[] = [];

  protected render() {
    return html`
      <p>${this.localize("ui.panel.page-authorize.pick_auth_provider")}:</p>
      ${this.authProviders.map(
        (provider) => html`
          <paper-item
            role="button"
            .auth_provider=${provider}
            @click=${this._handlePick}
          >
            <paper-item-body>${provider.name}</paper-item-body>
            <ha-icon-next></ha-icon-next>
          </paper-item>
        `
      )}
    `;
  }

  private _handlePick(ev) {
    fireEvent(this, "pick-auth-provider", ev.currentTarget.auth_provider);
  }

  static styles = css`
    paper-item {
      cursor: pointer;
    }
    p {
      margin-top: 0;
    }
  `;
}
customElements.define("ha-pick-auth-provider", HaPickAuthProvider);
