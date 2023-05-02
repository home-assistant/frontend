import { html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../../src/common/config/version";
import { applyThemesOnElement } from "../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../src/common/dom/fire_event";
import { mainWindow } from "../../src/common/dom/get_main_window";
import { isNavigationClick } from "../../src/common/dom/is-navigation-click";
import { navigate } from "../../src/common/navigate";
import { HassioPanelInfo } from "../../src/data/hassio/supervisor";
import { Supervisor } from "../../src/data/supervisor/supervisor";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import { HomeAssistant } from "../../src/types";
import "./hassio-router";
import { SupervisorBaseElement } from "./supervisor-base-element";

@customElement("hassio-main")
export class HassioMain extends SupervisorBaseElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public panel!: HassioPanelInfo;

  @property({ type: Boolean }) public narrow!: boolean;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    this._applyTheme();

    // Paulus - March 17, 2019
    // We went to a single hass-toggle-menu event in HA 0.90. However, the
    // supervisor UI can also run under older versions of Home Assistant.
    // So here we are going to translate toggle events into the appropriate
    // open and close events. These events are a no-op in newer versions of
    // Home Assistant.
    this.addEventListener("hass-toggle-menu", () => {
      fireEvent(
        (window.parent as any).customPanel,
        // @ts-ignore
        this.hass.dockedSidebar ? "hass-close-menu" : "hass-open-menu"
      );
    });
    // Paulus - March 19, 2019
    // We changed the navigate event to fire directly on the window, as that's
    // where we are listening for it. However, the older panel_custom will
    // listen on this element for navigation events, so we need to forward them.

    // Joakim - April 26, 2021
    // Due to changes in behavior in Google Chrome, we changed navigate to listen on the top element
    mainWindow.addEventListener("location-changed", (ev) =>
      // @ts-ignore
      fireEvent(this, ev.type, ev.detail, {
        bubbles: false,
      })
    );

    // Paulus - May 17, 2021
    // Convert the <a> tags to native nav in Home Assistant < 2021.6
    document.body.addEventListener("click", (ev) => {
      const href = isNavigationClick(ev);
      if (href) {
        navigate(href);
      }
    });

    // Forward haptic events to parent window.
    window.addEventListener("haptic", (ev) => {
      // @ts-ignore
      fireEvent(window.parent, ev.type, ev.detail, {
        bubbles: false,
      });
    });

    // Forward keydown events to the main window for quickbar access
    document.body.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.altKey || ev.ctrlKey || ev.shiftKey || ev.metaKey) {
        // Ignore if modifier keys are pressed
        return;
      }
      // @ts-ignore
      fireEvent(mainWindow, "hass-quick-bar-trigger", ev, {
        bubbles: false,
      });
    });

    makeDialogManager(this, this.shadowRoot!);
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return;
    }
    if (oldHass.themes !== this.hass.themes) {
      this._applyTheme();
    }
  }

  protected render() {
    return html`
      <hassio-router
        .hass=${this.hass}
        .supervisor=${this.supervisor}
        .route=${this.route}
        .panel=${this.panel}
        .narrow=${this.narrow}
      ></hassio-router>
    `;
  }

  private _applyTheme() {
    let themeName: string;
    let themeSettings: Partial<HomeAssistant["selectedTheme"]> | undefined;

    if (atLeastVersion(this.hass.config.version, 0, 114)) {
      themeName =
        this.hass.selectedTheme?.theme ||
        (this.hass.themes.darkMode && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme!
          : this.hass.themes.default_theme);

      themeSettings = this.hass.selectedTheme;
    } else {
      themeName =
        (this.hass.selectedTheme as unknown as string) ||
        this.hass.themes.default_theme;
    }

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      themeName,
      themeSettings,
      true
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-main": HassioMain;
  }
}
