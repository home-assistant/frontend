import { customElement, html, property, PropertyValues } from "lit-element";
import { atLeastVersion } from "../../src/common/config/version";
import { applyThemesOnElement } from "../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../src/common/dom/fire_event";
import { HassioPanelInfo } from "../../src/data/hassio/supervisor";
import { supervisorStore } from "../../src/data/supervisor/supervisor";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import "../../src/layouts/hass-loading-screen";
import { HomeAssistant, Route } from "../../src/types";
import "./hassio-router";
import { SupervisorBaseElement } from "./supervisor-base-element";

@customElement("hassio-main")
export class HassioMain extends SupervisorBaseElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public panel!: HassioPanelInfo;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route?: Route;

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
    window.addEventListener("location-changed", (ev) =>
      // @ts-ignore
      fireEvent(this, ev.type, ev.detail, {
        bubbles: false,
      })
    );

    // Forward haptic events to parent window.
    window.addEventListener("haptic", (ev) => {
      // @ts-ignore
      fireEvent(window.parent, ev.type, ev.detail, {
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
    if (!this.supervisor || !this.hass) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    if (
      Object.keys(supervisorStore).some((store) => !this.supervisor![store])
    ) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

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
    let options: Partial<HomeAssistant["selectedTheme"]> | undefined;

    if (atLeastVersion(this.hass.config.version, 0, 114)) {
      themeName =
        this.hass.selectedTheme?.theme ||
        (this.hass.themes.darkMode && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme!
          : this.hass.themes.default_theme);

      options = this.hass.selectedTheme;
      if (themeName === "default" && options?.dark === undefined) {
        options = {
          ...this.hass.selectedTheme,
          dark: this.hass.themes.darkMode,
        };
      }
    } else {
      themeName =
        ((this.hass.selectedTheme as unknown) as string) ||
        this.hass.themes.default_theme;
    }

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      themeName,
      options
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-main": HassioMain;
  }
}
