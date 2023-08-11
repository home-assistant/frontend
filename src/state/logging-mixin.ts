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
        const { createLogMessage } = await import("../resources/log-message");
        this._writeLog({
          // The error object from browsers includes the message and a stack trace,
          // so use the data in the error event just as fallback
          message: await createLogMessage(
            ev.error,
            "Uncaught error",
            ev.message,
            `@${ev.filename}:${ev.lineno}:${ev.colno}`
          ),
        });
      });
      window.addEventListener("unhandledrejection", async (ev) => {
        const { createLogMessage } = await import("../resources/log-message");
        this._writeLog({
          message: await createLogMessage(
            ev.reason,
            "Unhandled promise rejection"
          ),
        });
      });
    }

    protected firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.addEventListener("write_log", (ev) => {
        this._writeLog(ev.detail);
      });
    }

    private _writeLog(log: WriteLogParams) {
      this.hass?.callService("system_log", "write", {
        logger: `frontend.${
          __DEV__ ? "js_dev" : "js"
        }.${__BUILD__}.${__VERSION__.replace(".", "")}`,
        message: log.message,
        level: log.level || "error",
      });
    }
  };
