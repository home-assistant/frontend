/* eslint-disable no-console */
import type { ReactiveElement, PropertyValues } from "lit";
import { fireEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import { closeLastDialog } from "../dialogs/make-dialog-manager";
import type { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";
import type { Constructor } from "../types";

const DEBUG = false;

export const urlSyncMixin = <
  T extends Constructor<ReactiveElement & ProvideHassElement>,
>(
  superClass: T
) =>
  // Disable this functionality in the demo.
  __DEMO__
    ? superClass
    : class extends superClass {
        public connectedCallback(): void {
          super.connectedCallback();
          if (mainWindow.history.length === 1) {
            mainWindow.history.replaceState(
              { ...mainWindow.history.state, root: true },
              ""
            );
          }
          mainWindow.addEventListener("popstate", this._popstateChangeListener);
        }

        public disconnectedCallback(): void {
          super.disconnectedCallback();
          mainWindow.removeEventListener(
            "popstate",
            this._popstateChangeListener
          );
        }

        protected firstUpdated(changedProperties: PropertyValues<this>): void {
          super.firstUpdated(changedProperties);
          if (mainWindow.history.state?.dialog) {
            const refreshUrl = mainWindow.history.state.refreshUrl;
            if (typeof refreshUrl === "string") {
              // Page was refreshed while a dialog had stashed an intended
              // destination URL. Clean up the stale dialog state and route
              // to the intended URL. We bypass navigate() because its
              // ensureDialogsClosed loop would spin until timeout on the
              // dangling state.dialog with no actual dialog open.
              mainWindow.history.replaceState(null, "", refreshUrl);
              // Defer: the host element's firstUpdated registers the
              // location-changed listener after super.firstUpdated() returns.
              setTimeout(() => {
                fireEvent(mainWindow, "location-changed", { replace: true });
              });
              return;
            }
            // this is a page refresh with a dialog open
            // the dialog stack must be empty in this case so this state should be cleaned up
            mainWindow.history.back();
          }
        }

        private _popstateChangeListener = (ev: PopStateEvent) => {
          if (ev.state) {
            if (DEBUG) {
              console.log("popstate", ev);
            }
            if (ev.state.opensDialog) {
              // coming back from a dialog
              // if we are instead navigating forward, the dialogs are already closed
              closeLastDialog();
            }
            if ("dialogData" in ev.state) {
              // if we have dialog data we are closing a dialog with appended state
              // so dialog has the change to navigate back to the previous state
              closeLastDialog(ev.state);
            } else if ("dialog" in ev.state) {
              // coming to a dialog
              // the dialog stack must be empty in this case so this state should be cleaned up
              mainWindow.history.back();
            }
          }
        };
      };
