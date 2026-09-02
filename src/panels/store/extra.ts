import { mainWindow } from "../homeassistant-frontend/src/common/dom/get_main_window";
import { showToast } from "../homeassistant-frontend/src/util/toast";

(() => {
  const haDocument = mainWindow?.document?.querySelector("home-assistant");
  const hass = haDocument?.hass;

  function reloadHandler() {
    if ((haDocument as any).___hacs_reload_handler_active) {
      return;
    }
    if (!hass) {
      console.error("[HACS/extra/reload_handler] hass not found");
      return;
    }
    (haDocument as any).___hacs_reload_handler_active = true;
    hass.connection.subscribeEvents(() => {
      showToast(haDocument, {
        duration: 300 * 1000,
        dismissable: false,
        message: "[HACS] You need to reload your browser",
        action: {
          action: () => {
            mainWindow.location.href = mainWindow.location.href;
          },
          text: "reload",
        },
      });
    }, "hacs_resources_updated");
  }

  reloadHandler();
})();
