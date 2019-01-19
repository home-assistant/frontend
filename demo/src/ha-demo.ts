import { HomeAssistant } from "../../src/layouts/app/home-assistant";
import { provideHass } from "../../src/fake_data/provide_hass";
import { navigate } from "../../src/common/navigate";
import { mockLovelace } from "./lovelace";
import { mockAuth } from "./auth";
import { selectedDemoConfig } from "./configs/demo-configs";

class HaDemo extends HomeAssistant {
  protected async _handleConnProm() {
    const hass = provideHass(this, {
      panelUrl: (this as any).panelUrl,
    });
    mockLovelace(hass);
    mockAuth(hass);
    selectedDemoConfig.then((conf) => hass.addEntities(conf.entities()));

    // Taken from polymer/pwa-helpers. BSD-3 licensed
    document.body.addEventListener(
      "click",
      (e) => {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey
        ) {
          return;
        }

        const anchor = e
          .composedPath()
          .filter((n) => (n as HTMLElement).tagName === "A")[0] as
          | HTMLAnchorElement
          | undefined;
        if (
          !anchor ||
          anchor.target ||
          anchor.hasAttribute("download") ||
          anchor.getAttribute("rel") === "external"
        ) {
          return;
        }

        let href = anchor.href;
        if (!href || href.indexOf("mailto:") !== -1) {
          return;
        }

        const location = window.location;
        const origin =
          location.origin || location.protocol + "//" + location.host;
        if (href.indexOf(origin) !== 0) {
          return;
        }
        href = href.substr(origin.length);

        if (href === "#") {
          return;
        }

        e.preventDefault();
        navigate(this as any, href);
      },
      { capture: true }
    );

    (this as any).hassConnected();
  }
}

customElements.define("ha-demo", HaDemo);
