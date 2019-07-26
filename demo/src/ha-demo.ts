import { HomeAssistantAppEl } from "../../src/layouts/home-assistant";
import {
  provideHass,
  MockHomeAssistant,
} from "../../src/fake_data/provide_hass";
import { navigate } from "../../src/common/navigate";
import { mockLovelace } from "./stubs/lovelace";
import { mockAuth } from "./stubs/auth";
import { selectedDemoConfig } from "./configs/demo-configs";
import { mockTranslations } from "./stubs/translations";
import { mockHistory } from "./stubs/history";
import { mockShoppingList } from "./stubs/shopping_list";
import { mockSystemLog } from "./stubs/system_log";
import { mockTemplate } from "./stubs/template";
import { mockEvents } from "./stubs/events";
import { mockMediaPlayer } from "./stubs/media_player";
import { HomeAssistant } from "../../src/types";
import { mockFrontend } from "./stubs/frontend";
import { mockPersistentNotification } from "./stubs/persistent_notification";
import { isNavigationClick } from "../../src/common/dom/is-navigation-click";

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
