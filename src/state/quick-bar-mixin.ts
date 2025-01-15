import type { PropertyValues } from "lit";
import { tinykeys } from "tinykeys";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { mainWindow } from "../common/dom/get_main_window";
import type { QuickBarParams } from "../dialogs/quick-bar/show-dialog-quick-bar";
import {
  QuickBarMode,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { showToast } from "../util/toast";
import type { HassElement } from "./hass-element";
import { extractSearchParamsObject } from "../common/url/search-params";
import { showVoiceCommandDialog } from "../dialogs/voice-command-dialog/show-ha-voice-command-dialog";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
    "hass-quick-bar-trigger": KeyboardEvent;
    "hass-enable-shortcuts": HomeAssistant["enableShortcuts"];
  }
}

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      this.addEventListener("hass-enable-shortcuts", (ev) => {
        this._updateHass({ enableShortcuts: ev.detail });
        storeState(this.hass!);
      });

      mainWindow.addEventListener("hass-quick-bar-trigger", (ev) => {
        switch (ev.detail.key) {
          case "e":
            this._showQuickBar(ev.detail);
            break;
          case "c":
            this._showQuickBar(ev.detail, QuickBarMode.Command);
            break;
          case "d":
            this._showQuickBar(ev.detail, QuickBarMode.Device);
            break;
          case "m":
            this._createMyLink(ev.detail);
            break;
          case "a":
            this._showVoiceCommandDialog(ev.detail);
            break;
        }
      });

      this._registerShortcut();
    }

    private _registerShortcut() {
      tinykeys(window, {
        // Those are for latin keyboards that have e, c, m keys
        e: (ev) => this._showQuickBar(ev),
        c: (ev) => this._showQuickBar(ev, QuickBarMode.Command),
        m: (ev) => this._createMyLink(ev),
        a: (ev) => this._showVoiceCommandDialog(ev),
        d: (ev) => this._showQuickBar(ev, QuickBarMode.Device),
        // Those are fallbacks for non-latin keyboards that don't have e, c, m keys (qwerty-based shortcuts)
        KeyE: (ev) => this._showQuickBar(ev),
        KeyC: (ev) => this._showQuickBar(ev, QuickBarMode.Command),
        KeyM: (ev) => this._createMyLink(ev),
        KeyA: (ev) => this._showVoiceCommandDialog(ev),
        KeyD: (ev) => this._showQuickBar(ev, QuickBarMode.Device),
      });
    }

    private _conversation = memoizeOne((_components) =>
      isComponentLoaded(this.hass!, "conversation")
    );

    private _showVoiceCommandDialog(e: KeyboardEvent) {
      if (
        !this.hass?.enableShortcuts ||
        !this._canOverrideAlphanumericInput(e) ||
        !this._conversation(this.hass.config.components)
      ) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showVoiceCommandDialog(this, this.hass!, { pipeline_id: "last_used" });
    }

    private _showQuickBar(
      e: KeyboardEvent,
      mode: QuickBarMode = QuickBarMode.Entity
    ) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showQuickBar(this, { mode });
    }

    private async _createMyLink(e: KeyboardEvent) {
      if (
        !this.hass?.enableShortcuts ||
        !this._canOverrideAlphanumericInput(e)
      ) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      const targetPath = mainWindow.location.pathname;
      const isHassio = isComponentLoaded(this.hass, "hassio");
      const myParams = new URLSearchParams();

      if (isHassio && targetPath.startsWith("/hassio")) {
        const myPanelSupervisor = await import(
          "../../hassio/src/hassio-my-redirect"
        );
        for (const [slug, redirect] of Object.entries(
          myPanelSupervisor.REDIRECTS
        )) {
          if (targetPath.startsWith(redirect.redirect)) {
            myParams.append("redirect", slug);
            if (redirect.redirect === "/hassio/addon") {
              myParams.append("addon", targetPath.split("/")[3]);
            }
            window.open(
              `https://my.home-assistant.io/create-link/?${myParams.toString()}`,
              "_blank"
            );
            return;
          }
        }
      }

      const myPanel = await import("../panels/my/ha-panel-my");

      for (const [slug, redirect] of Object.entries(myPanel.getMyRedirects())) {
        if (targetPath.startsWith(redirect.redirect)) {
          myParams.append("redirect", slug);
          if (redirect.params) {
            const params = extractSearchParamsObject();
            for (const key of Object.keys(redirect.params)) {
              if (key in params) {
                myParams.append(key, params[key]);
              }
            }
          }
          window.open(
            `https://my.home-assistant.io/create-link/?${myParams.toString()}`,
            "_blank"
          );
          return;
        }
      }
      showToast(this, {
        message: this.hass.localize(
          "ui.notification_toast.no_matching_link_found",
          {
            path: targetPath,
          }
        ),
      });
    }

    private _canShowQuickBar(e: KeyboardEvent) {
      return (
        this.hass?.user?.is_admin &&
        this.hass.enableShortcuts &&
        this._canOverrideAlphanumericInput(e)
      );
    }

    private _canOverrideAlphanumericInput(e: KeyboardEvent) {
      const el = e.composedPath()[0] as Element;

      if (el.tagName === "TEXTAREA") {
        return false;
      }

      if (el.parentElement?.tagName === "HA-SELECT") {
        return false;
      }

      if (el.tagName !== "INPUT") {
        return true;
      }

      switch ((el as HTMLInputElement).type) {
        case "button":
        case "checkbox":
        case "hidden":
        case "radio":
        case "range":
          return true;
        default:
          return false;
      }
    }
  };
