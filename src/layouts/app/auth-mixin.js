import { afterNextRender } from "@polymer/polymer/lib/utils/render-status";
import { getUser } from "home-assistant-js-websocket";
import { clearState } from "../../util/ha-pref-storage";
import { askWrite } from "../../common/auth/token_storage";
import { subscribeUser } from "../../data/ws-user";

export default (superClass) =>
  class extends superClass {
    firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("hass-logout", () => this._handleLogout());
      // HACK :( We don't have a way yet to trigger an update of `subscribeUser`
      this.addEventListener("hass-refresh-current-user", () =>
        getUser(this.hass.connection).then((user) => this._updateHass({ user }))
      );
    }

    hassConnected() {
      super.hassConnected();
      subscribeUser(this.hass.connection, (user) => this._updateHass({ user }));

      afterNextRender(null, () => {
        if (askWrite()) {
          const el = document.createElement("ha-store-auth-card");
          this.shadowRoot.appendChild(el);
          this.provideHass(el);
          import(/* webpackChunkName: "ha-store-auth-card" */ "../../dialogs/ha-store-auth-card");
        }
      });
    }

    async _handleLogout() {
      try {
        await this.hass.auth.revoke();
        this.hass.connection.close();
        clearState();
        document.location.href = "/";
      } catch (err) {
        // eslint-disable-next-line
        console.error(err);
        alert("Log out failed");
      }
    }
  };
