import { clearState } from "../util/ha-pref-storage";
import { askWrite } from "../common/auth/token_storage";
import { subscribeUser, userCollection } from "../data/ws-user";
import { HassBaseEl } from "./hass-base-mixin";
import { Constructor } from "../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-refresh-current-user": undefined;
  }
}

export default <T extends Constructor<HassBaseEl>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-logout", () => this._handleLogout());
      this.addEventListener("hass-refresh-current-user", () => {
        userCollection(this.hass!.connection).refresh();
      });
    }

    protected hassConnected() {
      super.hassConnected();
      subscribeUser(this.hass!.connection, (user) =>
        this._updateHass({ user })
      );

      if (askWrite()) {
        this.updateComplete
          .then(() =>
            import(/* webpackChunkName: "ha-store-auth-card" */ "../dialogs/ha-store-auth-card")
          )
          .then(() => {
            const el = document.createElement("ha-store-auth-card");
            this.shadowRoot!.appendChild(el);
            this.provideHass(el);
          });
      }
    }

    private async _handleLogout() {
      try {
        await this.hass!.auth.revoke();
        this.hass!.connection.close();
        clearState();
        document.location.href = "/";
      } catch (err) {
        // tslint:disable-next-line
        console.error(err);
        alert("Log out failed");
      }
    }
  };
