import {
  html,
  PropertyValues,
  customElement,
  LitElement,
  property,
} from "lit-element";
import "./hassio-router";
import { urlSyncMixin } from "../../src/state/url-sync-mixin";
import { ProvideHassLitMixin } from "../../src/mixins/provide-hass-lit-mixin";
import { HomeAssistant, Route } from "../../src/types";
import { HassioPanelInfo } from "../../src/data/hassio/supervisor";
import { applyThemesOnElement } from "../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../src/common/dom/fire_event";
import { makeDialogManager } from "../../src/dialogs/make-dialog-manager";
import { atLeastVersion } from "../../src/common/config/version";

@customElement("hassio-main")
export class HassioMain extends urlSyncMixin(ProvideHassLitMixin(LitElement)) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public panel!: HassioPanelInfo;

  @property() public narrow!: boolean;

  @property() public route?: Route;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    applyThemesOnElement(
      this.parentElement,
      this.hass.themes,
      (atLeastVersion(this.hass.config.version, 0, 114)
        ? this.hass.selectedTheme?.theme
        : ((this.hass.selectedTheme as unknown) as string)) ||
        this.hass.themes.default_theme,
      this.hass.selectedTheme
    );

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

  protected render() {
    return html`
      <hassio-router
        .hass=${this.hass}
        .route=${this.route}
        .panel=${this.panel}
        .narrow=${this.narrow}
      ></hassio-router>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-main": HassioMain;
  }
}
