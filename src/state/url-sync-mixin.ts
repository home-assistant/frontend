/* eslint-disable no-console */
import type { PropertyValueMap, ReactiveElement } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import type {
  DialogClosedParams,
  DialogState,
} from "../dialogs/make-dialog-manager";
import { closeDialog, showDialog } from "../dialogs/make-dialog-manager";
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
          this.addEventListener("dialog-closed", this._dialogClosedListener);
        }

        public disconnectedCallback(): void {
          super.disconnectedCallback();
          mainWindow.removeEventListener(
            "popstate",
            this._popstateChangeListener
          );
          this.removeEventListener("dialog-closed", this._dialogClosedListener);
        }

        protected firstUpdated(
          changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
        ): void {
          super.firstUpdated(changedProperties);
          if (mainWindow.history.state?.dialog) {
            this._handleDialogStateChange(mainWindow.history.state);
          }
        }

        private _dialogClosedListener = (
          ev: HASSDomEvent<DialogClosedParams>
        ) => {
          if (DEBUG) {
            console.log("dialog closed", ev.detail.dialog);
            console.log(
              "open",
              mainWindow.history.state?.open,
              "dialog",
              mainWindow.history.state?.dialog
            );
          }
          // If not closed by navigating back, and not a new dialog is open, remove the open state from history
          if (
            mainWindow.history.length > 1 &&
            mainWindow.history.state?.open &&
            mainWindow.history.state?.dialog === ev.detail.dialog
          ) {
            if (DEBUG) {
              console.log("remove state", ev.detail.dialog);
            }
            mainWindow.history.back();
          }
        };

        private _popstateChangeListener = (ev: PopStateEvent) => {
          if (ev.state) {
            if (DEBUG) {
              console.log("popstate", ev);
            }
            if ("nextState" in ev.state) {
              // coming back from a dialog
              this._closeDialog(ev.state.nextState);
            }
            if ("dialog" in ev.state) {
              // coming to a dialog
              this._handleDialogStateChange(ev.state);
            }
          }
        };

        private async _handleDialogStateChange(state: DialogState) {
          if (DEBUG) {
            console.log("handle state", state);
          }
          if (state.open && state.dialogParams !== null) {
            await showDialog(
              this,
              this.shadowRoot!,
              state.dialog,
              state.dialogParams,
              undefined,
              false
            );
          }
        }

        private async _closeDialog(dialogState: DialogState) {
          const closed = await closeDialog(dialogState.dialog);
          if (!closed) {
            if (DEBUG) {
              console.log("dialog could not be closed");
            }
            // dialog could not be closed, push state again
            mainWindow.history.pushState(dialogState, "");
          }
        }
      };
