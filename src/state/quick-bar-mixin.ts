import type { PropertyValues } from "lit";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { canOverrideAlphanumericInput } from "../common/dom/can-override-input";
import { mainWindow } from "../common/dom/get_main_window";
import { ShortcutManager } from "../common/keyboard/shortcuts";
import { extractSearchParamsObject } from "../common/url/search-params";
import type {
  QuickBarContextItem,
  QuickBarParams,
  QuickBarSection,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import {
  closeQuickBar,
  showQuickBar,
} from "../dialogs/quick-bar/show-dialog-quick-bar";
import { findRelated, type RelatedResult } from "../data/search";
import { showShortcutsDialog } from "../dialogs/shortcuts/show-shortcuts-dialog";
import { showVoiceCommandDialog } from "../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import type { Constructor, HomeAssistant } from "../types";
import { storeState } from "../util/ha-pref-storage";
import { showToast } from "../util/toast";
import type { HassElement } from "./hass-element";

declare global {
  interface HASSDomEvents {
    "hass-quick-bar": QuickBarParams;
    "hass-quick-bar-trigger": KeyboardEvent;
    "hass-enable-shortcuts": HomeAssistant["enableShortcuts"];
    "hass-quick-bar-context": QuickBarContextItem | undefined;
  }
}

export default <T extends Constructor<HassElement>>(superClass: T) =>
  class extends superClass {
    private _quickBarOpen = false;

    private _quickBarContext?: QuickBarContextItem;

    private _quickBarContextRelated?: RelatedResult;

    private _fetchRelatedMemoized = memoizeOne(
      (itemType: QuickBarContextItem["itemType"], itemId: string) =>
        findRelated(this.hass!, itemType, itemId)
    );

    private _clearQuickBarContext = () => {
      this._quickBarContext = undefined;
      this._quickBarContextRelated = undefined;
    };

    private _contextMatches = (context?: QuickBarContextItem) =>
      context?.itemType === this._quickBarContext?.itemType &&
      context?.itemId === this._quickBarContext?.itemId;

    private _prefetchQuickBarContext = async (
      context?: QuickBarContextItem
    ) => {
      this._quickBarContextRelated = undefined;

      if (!context) {
        return;
      }

      try {
        const related = await this._fetchRelatedMemoized(
          context.itemType,
          context.itemId
        );

        if (this._contextMatches(context)) {
          this._quickBarContextRelated = related;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Error prefetching quick bar related items", err);

        if (this._contextMatches(context)) {
          this._quickBarContextRelated = undefined;
        }
      }
    };

    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);

      this.addEventListener("hass-enable-shortcuts", (ev) => {
        this._updateHass({ enableShortcuts: ev.detail });
        storeState(this.hass!);
      });

      this.addEventListener(
        "show-dialog",
        (ev) => {
          if ((ev as CustomEvent).detail.dialogTag === "ha-quick-bar") {
            // If quick bar is already open, prevent opening it again
            if (this._quickBarOpen) {
              ev.stopPropagation();
              ev.preventDefault();
              return;
            }
            this._quickBarOpen = true;
          }
        },
        { capture: true }
      );

      this.addEventListener("dialog-closed", (ev) => {
        if ((ev as CustomEvent).detail.dialog === "ha-quick-bar") {
          this._quickBarOpen = false;
        }
      });

      this.addEventListener("hass-quick-bar-context", (ev) => {
        this._quickBarContext =
          ev.detail && "itemType" in ev.detail && "itemId" in ev.detail
            ? ev.detail
            : undefined;
        this._prefetchQuickBarContext(this._quickBarContext);
      });

      mainWindow.addEventListener(
        "location-changed",
        this._clearQuickBarContext
      );
      mainWindow.addEventListener("popstate", this._clearQuickBarContext);

      mainWindow.addEventListener("hass-quick-bar-trigger", (ev) => {
        switch (ev.detail.key) {
          case "e":
            this._showQuickBar(ev.detail, "entity");
            break;
          case "c":
            this._showQuickBar(ev.detail, "command");
            break;
          case "d":
            this._showQuickBar(ev.detail, "device");
            break;
          case "m":
            this._createMyLink(ev.detail);
            break;
          case "a":
            this._showVoiceCommandDialog(ev.detail);
            break;
          case "?":
            this._showShortcutDialog(ev.detail);
        }
      });

      this._registerShortcut();
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      mainWindow.removeEventListener(
        "location-changed",
        this._clearQuickBarContext
      );
      mainWindow.removeEventListener("popstate", this._clearQuickBarContext);
    }

    private _registerShortcut() {
      const shortcutManager = new ShortcutManager();
      shortcutManager.add({
        // Those are for latin keyboards that have e, c, m keys
        e: { handler: (ev) => this._showQuickBar(ev, "entity") },
        c: { handler: (ev) => this._showQuickBar(ev, "command") },
        m: { handler: (ev) => this._createMyLink(ev) },
        a: { handler: (ev) => this._showVoiceCommandDialog(ev) },
        d: { handler: (ev) => this._showQuickBar(ev, "device") },
        "$mod+k": {
          handler: (ev) => this._toggleQuickBar(ev),
          allowWhenTextSelected: true,
          allowInInput: true,
        },
        // Workaround see https://github.com/jamiebuilds/tinykeys/issues/130
        "Shift+?": { handler: (ev) => this._showShortcutDialog(ev) },
        // Those are fallbacks for non-latin keyboards that don't have e, c, m keys (qwerty-based shortcuts)
        KeyE: { handler: (ev) => this._showQuickBar(ev, "entity") },
        KeyC: { handler: (ev) => this._showQuickBar(ev, "command") },
        KeyM: { handler: (ev) => this._createMyLink(ev) },
        KeyA: { handler: (ev) => this._showVoiceCommandDialog(ev) },
        KeyD: { handler: (ev) => this._showQuickBar(ev, "device") },
        "$mod+KeyK": {
          handler: (ev) => this._toggleQuickBar(ev),
          allowWhenTextSelected: true,
          allowInInput: true,
        },
      });
    }

    private _conversation = memoizeOne((_components) =>
      isComponentLoaded(this.hass!, "conversation")
    );

    private _showVoiceCommandDialog(e: KeyboardEvent) {
      if (
        !this.hass?.enableShortcuts ||
        !canOverrideAlphanumericInput(e.composedPath()) ||
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

    private _showQuickBar(e: KeyboardEvent, mode?: QuickBarSection) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showQuickBar(this, {
        mode,
        contextItem: this._quickBarContext,
        related: this._quickBarContextRelated,
      });
    }

    private _toggleQuickBar(e: KeyboardEvent, mode?: QuickBarSection) {
      if (!this._canToggleQuickBar()) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      if (!this._quickBarOpen) {
        showQuickBar(this, { mode });
        return;
      }
      closeQuickBar();
    }

    private _showShortcutDialog(e: KeyboardEvent) {
      if (!this._canShowQuickBar(e)) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      showShortcutsDialog(this);
    }

    private async _createMyLink(e: KeyboardEvent) {
      if (
        !this.hass?.enableShortcuts ||
        !canOverrideAlphanumericInput(e.composedPath())
      ) {
        return;
      }

      if (e.defaultPrevented) {
        return;
      }
      e.preventDefault();

      const targetPath = mainWindow.location.pathname;
      const myParams = new URLSearchParams();

      const myPanel = await import("../panels/my/ha-panel-my");
      const redirects = myPanel.getMyRedirects();

      for (const [slug, redirect] of Object.entries(redirects)) {
        if (!targetPath.startsWith(redirect.redirect)) {
          continue;
        }
        myParams.append("redirect", slug);

        if (redirect.params) {
          const params = extractSearchParamsObject();
          for (const key of Object.keys(redirect.params)) {
            if (key in params) {
              myParams.append(key, params[key]);
            }
          }
        }
        if (redirect.redirect === "/config/integrations/integration") {
          myParams.append("domain", targetPath.split("/")[4]);
        } else if (redirect.redirect === "/config/app") {
          myParams.append("app", targetPath.split("/")[3]);
        } else if (redirect.redirect === "/hassio/addon") {
          myParams.append("addon", targetPath.split("/")[3]);
        }
        window.open(
          `https://my.home-assistant.io/create-link/?${myParams.toString()}`,
          "_blank"
        );
        return;
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
        !this._quickBarOpen &&
        this.hass?.user?.is_admin &&
        this.hass.enableShortcuts &&
        canOverrideAlphanumericInput(e.composedPath())
      );
    }

    private _canToggleQuickBar() {
      return this.hass?.user?.is_admin && this.hass.enableShortcuts;
    }
  };
