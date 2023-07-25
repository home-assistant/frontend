/* eslint-disable no-console */
import { PropertyValueMap, ReactiveElement } from "lit";
import { HASSDomEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import {
  closeDialog,
  DialogClosedParams,
  DialogState,
  showDialog,
} from "../dialogs/make-dialog-manager";
import { ProvideHassElement } from "../mixins/provide-hass-lit-mixin";
import { Constructor } from "../types";

const DEBUG = false;

// eslint-disable-next-line import/no-mutable-exports
export let historyPromise: Promise<void> | undefined;

let historyResolve: undefined | (() => void);

export const urlSyncMixin = <
  T extends Constructor<ReactiveElement & ProvideHassElement>,
>(
  superClass: T
) =>
  // Disable this functionality in the demo.
  __DEMO__
    ? superClass
    : class extends superClass {
        private _ignoreNextPopState = false;

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
            mainWindow.history.state?.open &&
            mainWindow.history.state?.dialog === ev.detail.dialog
          ) {
            if (DEBUG) {
              console.log("remove state", ev.detail.dialog);
            }
            if (mainWindow.history.length) {
              this._ignoreNextPopState = true;
              historyPromise = new Promise((resolve) => {
                historyResolve = () => {
                  resolve();
                  historyResolve = undefined;
                  historyPromise = undefined;
                };
                mainWindow.history.back();
              });
            }
          }
        };

        private _popstateChangeListener = (ev: PopStateEvent) => {
          if (this._ignoreNextPopState) {
            if (
              history.length &&
              (ev.state?.oldState?.replaced ||
                ev.state?.oldState?.dialogParams === null)
            ) {
              // if the previous dialog was replaced, or we could not copy the params, and the current dialog is closed, we should also remove the previous dialog from history
              if (DEBUG) {
                console.log("remove old state", ev.state.oldState);
              }
              mainWindow.history.back();
              return;
            }
            if (DEBUG) {
              console.log("ignore popstate");
            }
            this._ignoreNextPopState = false;
            if (historyResolve) {
              historyResolve();
            }
            return;
          }
          if (ev.state && "dialog" in ev.state) {
            if (DEBUG) {
              console.log("popstate", ev);
            }
            this._handleDialogStateChange(ev.state);
          }
          if (historyResolve) {
            historyResolve();
          }
        };

        private async _handleDialogStateChange(state: DialogState) {
          if (DEBUG) {
            console.log("handle state", state);
          }
          if (!state.open) {
            const closed = await closeDialog(state.dialog);
            if (!closed) {
              if (DEBUG) {
                console.log("dialog could not be closed");
              }
              // dialog could not be closed, push state again
              mainWindow.history.pushState(
                {
                  dialog: state.dialog,
                  open: true,
                  dialogParams: null,
                  oldState: null,
                },
                ""
              );
              return;
            }
            if (state.oldState) {
              if (DEBUG) {
                console.log("handle old state");
              }
              this._handleDialogStateChange(state.oldState);
            }
            return;
          }
          let shown = false;
          if (state.open && state.dialogParams !== null) {
            shown = await showDialog(
              this,
              this.shadowRoot!,
              state.dialog,
              state.dialogParams
            );
          }
          if (!shown) {
            // can't open dialog, update state
            mainWindow.history.replaceState(
              { ...mainWindow.history.state, open: false },
              ""
            );
          }
        }
      };
