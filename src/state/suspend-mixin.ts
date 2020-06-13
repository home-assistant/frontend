import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export const suspendMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private __hiddenTimeout?: number;

    private __visiblePromiseResolve?: () => void;

    protected hassConnected() {
      super.hassConnected();

      document.addEventListener(
        "visibilitychange",
        () => this.__handleVisibilityChange(),
        false
      );
    }

    private __handleVisibilityChange() {
      if (document.hidden) {
        // If the document is hidden, we will prevent reconnects until we are visible again
        this.hass!.connection.suspendReconnectUntil(
          new Promise((resolve) => {
            this.__visiblePromiseResolve = resolve;
          })
        );
        // We close the connection to Home Assistant after being hidden for 5 minutes
        this.__hiddenTimeout = window.setTimeout(() => {
          this.__hiddenTimeout = undefined;
          this.hass!.connection.suspend();
        }, 300000);
      } else {
        // Clear timer to close the connection
        if (this.__hiddenTimeout) {
          clearTimeout(this.__hiddenTimeout);
          this.__hiddenTimeout = undefined;
        }
        // Unsuspend the reconnect
        if (this.__visiblePromiseResolve) {
          this.__visiblePromiseResolve();
          this.__visiblePromiseResolve = undefined;
        }
      }
    }
  };
