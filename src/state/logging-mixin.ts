import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import type { SystemLogLevel } from "../data/system_log";
import type { Constructor } from "../types";
import { recoverFromStaleBuild } from "../util/recover-stale-build";
import type { HassBaseEl } from "./hass-base-mixin";

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
    write_log: HASSDomEvent<HASSDomEvents["write_log"]>;
  }
}

export const loggingMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    protected hassConnected() {
      super.hassConnected();
      // Resource-load errors (<script>, modulepreload <link>) do not bubble,
      // so observe them in the capture phase. A stale build's hashed chunk
      // 404 lands here (legacy build / modulepreload); recover instead of
      // dead-ending.
      window.addEventListener(
        "error",
        (ev) => {
          const target = ev.target as
            (HTMLScriptElement & HTMLLinkElement) | null;
          if (
            target &&
            (target.tagName === "SCRIPT" || target.tagName === "LINK")
          ) {
            recoverFromStaleBuild(target.src || target.href, this);
          }
        },
        true
      );
      window.addEventListener("error", async (ev) => {
        // A stale build can surface as a runtime error while evaluating a
        // freshly (re)loaded chunk; recover rather than log it.
        if (recoverFromStaleBuild(ev.error?.message || ev.message, this)) {
          ev.preventDefault();
          return;
        }
        if (!this.hass?.connected) {
          return;
        }
        if (
          (!__DEV__ &&
            ev.message.includes("ResizeObserver loop limit exceeded")) ||
          ev.message.includes(
            "ResizeObserver loop completed with undelivered notifications"
          )
        ) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          ev.stopPropagation();
          return;
        }
        try {
          const { createLogMessage } = await import("../resources/log-message");
          const message = await createLogMessage(
            ev.error,
            "Uncaught error",
            // The error object from browsers includes the message and a stack trace,
            // so use the data in the error event just as fallback
            ev.message,
            `@${ev.filename}:${ev.lineno}:${ev.colno}`
          );
          await this._writeLog({ message });
        } catch (e) {
          // catch errors during logging so we don't get into a loop
          // eslint-disable-next-line no-console
          console.error("Failure writing uncaught error to system log:", e);
        }
      });
      window.addEventListener("unhandledrejection", async (ev) => {
        // A failed dynamic import() of a stale build's chunk rejects here
        // (dialogs, more-info, cards, config-flow, …); recover rather than
        // silently logging it at debug level.
        const reason: any = ev.reason;
        const reasonMessage =
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "";
        if (recoverFromStaleBuild(reasonMessage, this)) {
          ev.preventDefault();
          return;
        }
        if (!this.hass?.connected) {
          return;
        }
        try {
          const { createLogMessage } = await import("../resources/log-message");
          const message = await createLogMessage(
            ev.reason,
            "Unhandled promise rejection"
          );
          await this._writeLog({
            message,
            level: "debug",
          });
        } catch (e) {
          // catch errors during logging so we don't get into a loop
          // eslint-disable-next-line no-console
          console.error(
            "Failure writing unhandled promise rejection to system log:",
            e
          );
        }
      });
    }

    protected firstUpdated(changedProps: PropertyValues<this>) {
      super.firstUpdated(changedProps);
      this.addEventListener("write_log", (ev) => {
        this._writeLog(ev.detail);
      });
    }

    private _writeLog(log: WriteLogParams) {
      return this.hass?.callService(
        "system_log",
        "write",
        {
          logger: `frontend.${
            __DEV__ ? "js_dev" : "js"
          }.${__BUILD__}.${__VERSION__.replace(".", "")}`,
          message: log.message,
          level: log.level || "error",
        },
        undefined,
        false
      );
    }
  };
