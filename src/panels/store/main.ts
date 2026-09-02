import type { PropertyValues } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../homeassistant-frontend/src/common/dom/apply_themes_on_element";
import { fireEvent } from "../homeassistant-frontend/src/common/dom/fire_event";
import { mainWindow } from "../homeassistant-frontend/src/common/dom/get_main_window";
import { isNavigationClick } from "../homeassistant-frontend/src/common/dom/is-navigation-click";
import { navigate } from "../homeassistant-frontend/src/common/navigate";
import { makeDialogManager } from "../homeassistant-frontend/src/dialogs/make-dialog-manager";
import type { HomeAssistant, Route } from "../homeassistant-frontend/src/types";
import { LocationChangedEvent } from "./data/common";
import type { Hacs } from "./data/hacs";
import { HacsElement } from "./hacs";
import "./hacs-router";
import { HacsStyles } from "./styles/hacs-common-style";
import { hacsStyleVariables } from "./styles/variables";

@customElement("hacs-frontend")
class HacsFrontend extends HacsElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public hacs!: Hacs;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    this._applyTheme();

    this.addEventListener("hacs-location-changed", (e) =>
      this._setRoute(e as LocationChangedEvent),
    );

    if (this.route.path === "") {
      navigate("/hacs/entry", { replace: true });
    }

    window.addEventListener("haptic", (ev) => {
      // @ts-ignore
      fireEvent(window.parent, ev.type, ev.detail, {
        bubbles: false,
      });
    });

    document.body.addEventListener("click", (ev) => {
      const href = isNavigationClick(ev);
      if (href) {
        navigate(href);
      }
    });

    mainWindow.addEventListener("location-changed", (ev) =>
      // @ts-ignore
      fireEvent(this, ev.type, ev.detail, {
        bubbles: false,
      }),
    );

    document.body.addEventListener("keydown", (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.shiftKey || ev.metaKey || ev.altKey) {
        // Ignore if modifier keys are pressed
        return;
      }
      if (["a", "c", "d", "e", "m"].includes(ev.key)) {
        // @ts-ignore
        fireEvent(mainWindow, "hass-quick-bar-trigger", ev, {
          bubbles: false,
        });
      }
    });

    mainWindow
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (_) => this._applyTheme());

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
    if (!this.hass || !this.hacs?.info?.categories?.length || this.hacs?.localize === undefined) {
      return nothing;
    }

    return html`
      <hacs-router
        .hass=${this.hass}
        .hacs=${this.hacs}
        .route=${this.route}
        .narrow=${this.narrow}
      ></hacs-router>
    `;
  }

  static get styles() {
    return [
      HacsStyles,
      hacsStyleVariables,
      css`
        hass-loading-screen {
          height: 100vh;
        }
      `,
    ];
  }

  private _setRoute(ev: LocationChangedEvent): void {
    if (!ev.detail?.route) {
      return;
    }
    this.route = ev.detail.route;
    navigate(this.route.path, { replace: true });
    this.requestUpdate();
  }

  private _applyTheme() {
    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      this.hass.selectedTheme?.theme ||
        (this.hass.themes.darkMode && this.hass.themes.default_dark_theme
          ? this.hass.themes.default_dark_theme!
          : this.hass.themes.default_theme),
      {
        ...this.hass.selectedTheme,
        dark: this.hass.themes.darkMode,
      },
    );
    this.parentElement!.style.backgroundColor = "var(--primary-background-color)";
    this.parentElement!.style.color = "var(--primary-text-color)";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-frontend": HacsFrontend;
  }
}
