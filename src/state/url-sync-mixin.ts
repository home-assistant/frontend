/* eslint-disable no-console */
import type { PropertyValueMap, ReactiveElement } from "lit";
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

        protected firstUpdated(
          changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
        ): void {
          super.firstUpdated(changedProperties);
          if (mainWindow.history.state?.dialog) {
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
            if ("dialog" in ev.state) {
              // coming to a dialog
              // the dialog stack must be empty in this case so this state should be cleaned up
              mainWindow.history.back();
            }
          }
        };
      };
