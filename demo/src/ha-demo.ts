// Compat needs to be first import
import "../../src/resources/compatibility";
import { isNavigationClick } from "../../src/common/dom/is-navigation-click";
import { navigate } from "../../src/common/navigate";
import {
  MockHomeAssistant,
  provideHass,
} from "../../src/fake_data/provide_hass";
import { HomeAssistantAppEl } from "../../src/layouts/home-assistant";
import { HomeAssistant } from "../../src/types";
import { selectedDemoConfig } from "./configs/demo-configs";
import { mockAuth } from "./stubs/auth";
import { mockEvents } from "./stubs/events";
import { mockFrontend } from "./stubs/frontend";
import { mockHistory } from "./stubs/history";
import { mockLovelace } from "./stubs/lovelace";
import { mockMediaPlayer } from "./stubs/media_player";
import { mockPersistentNotification } from "./stubs/persistent_notification";
import { mockShoppingList } from "./stubs/shopping_list";
import { mockSystemLog } from "./stubs/system_log";
import { mockTemplate } from "./stubs/template";
import { mockTranslations } from "./stubs/translations";

class HaDemo extends HomeAssistantAppEl {
  protected async _initialize() {
    const initial: Partial<MockHomeAssistant> = {
      panelUrl: (this as any).panelUrl,
      // Override updateHass so that the correct hass lifecycle methods are called
      updateHass: (hassUpdate: Partial<HomeAssistant>) =>
        this._updateHass(hassUpdate),
    };

    const hass = (this.hass = provideHass(this, initial));
    const localizePromise =
      // @ts-ignore
      this._loadFragmentTranslations(hass.language, "page-demo").then(
        () => this.hass!.localize
      );

    mockLovelace(hass, localizePromise);
    mockAuth(hass);
    mockTranslations(hass);
    mockHistory(hass);
    mockShoppingList(hass);
    mockSystemLog(hass);
    mockTemplate(hass);
    mockEvents(hass);
    mockMediaPlayer(hass);
    mockFrontend(hass);
    mockPersistentNotification(hass);

    // Once config is loaded AND localize, set entities and apply theme.
    Promise.all([selectedDemoConfig, localizePromise]).then(
      ([conf, localize]) => {
        hass.addEntities(conf.entities(localize));
        if (conf.theme) {
          hass.mockTheme(conf.theme());
        }
      }
    );

    // Taken from polymer/pwa-helpers. BSD-3 licensed
    document.body.addEventListener(
      "click",
      (e) => {
        const href = isNavigationClick(e);

        if (!href) {
          return;
        }

        e.preventDefault();
        navigate(this, href);
      },
      { capture: true }
    );

    (this as any).hassConnected();
  }
}

customElements.define("ha-demo", HaDemo);
