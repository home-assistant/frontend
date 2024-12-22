import { subscribeUser, userCollection } from "../data/ws-user";
import { Constructor } from "../types";
import { clearState } from "../util/ha-pref-storage";
import { HassBaseEl } from "./hass-base-mixin";

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
    }

    private async _handleLogout() {
      try {
        await this.hass!.auth.revoke();
        this.hass!.connection.close();
        clearState();
        document.location.href = "/";
      } catch (err: any) {
        // eslint-disable-next-line
        console.error(err);
        alert("Log out failed");
      }
    }
  };
