import { HASSDomEvent } from "../common/dom/fire_event";
import { SystemLogLevel } from "../data/system_log";
import { Constructor } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

interface WriteLogParams {
  level?: SystemLogLevel;
  message: string;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    write_log: WriteLogParams;
  }
  interface HTMLElementEventMap {
    write_log: HASSDomEvent<WriteLogParams>;
  }
}

export const loggingMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    protected hassConnected() {
      super.hassConnected();
      window.addEventListener("error", async (ev) => {
        if (!this.hass?.connected) {
          return;
        }
        if (
          !__DEV__ &&
          (ev.message.includes("ResizeObserver loop limit exceeded") ||
            ev.message.includes(
              "ResizeObserver loop completed with undelivered notifications"
            ))
        ) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          ev.stopPropagation();
          return;
        }
        let message;
        try {
          const { createLogMessage } = await import("../resources/log-message");
          message = await createLogMessage(
            ev.error,
            "Uncaught error",
            ev.message,
            `@${ev.filename}:${ev.lineno}:${ev.colno}`
          );
          await this._writeLog({
            // The error object from browsers includes the message and a stack trace,
            // so use the data in the error event just as fallback
            message,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Error during logging error:", message, e);
          // catch errors during logging so we don't get into a loop
        }
      });
      window.addEventListener("unhandledrejection", async (ev) => {
        if (!this.hass?.connected) {
          return;
        }
        let message;
        try {
          const { createLogMessage } = await import("../resources/log-message");
          message = await createLogMessage(
            ev.reason,
            "Unhandled promise rejection"
          );
          await this._writeLog({
            message,
            level: "debug",
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Error during logging error:", message, e);
          // catch errors during logging so we don't get into a loop
        }
      });
    }

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("write_log", (ev) => {
        this._writeLog(ev.detail);
      });
    }

    private _writeLog(log: WriteLogParams) {
      return this.hass?.callService("system_log", "write", {
        logger: `frontend.${
          __DEV__ ? "js_dev" : "js"
        }.${__BUILD__}.${__VERSION__.replace(".", "")}`,
        message: log.message,
        level: log.level || "error",
      });
    }
  };
