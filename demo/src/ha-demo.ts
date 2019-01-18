import { HomeAssistant } from "../../src/layouts/app/home-assistant";
import { provideHass } from "../../src/fake_data/provide_hass";
import { entities } from "./entities";
import { navigate } from "../../src/common/navigate";

class HaDemo extends HomeAssistant {
  protected async _handleConnProm() {
    const hass = provideHass(this);
    hass.addEntities(entities);

    hass.mockWS("lovelace/config", () =>
      Promise.reject({
        code: "config_not_found",
      })
    );

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

        const href = anchor.href;
        if (!href || href.indexOf("mailto:") !== -1) {
          return;
        }

        const location = window.location;
        const origin =
          location.origin || location.protocol + "//" + location.host;
        if (href.indexOf(origin) !== 0) {
          return;
        }

        e.preventDefault();
        navigate(this as any, href.substr(origin.length + 1));
      },
      { capture: true }
    );

    (this as any).hassConnected();
  }

  get _useHashAsPath() {
    return true;
  }
}

customElements.define("ha-demo", HaDemo);
