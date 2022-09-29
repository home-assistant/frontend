import { html } from "lit";
import { getConfigEntries } from "../../data/config_entries";
import { showConfigFlowDialog } from "../../dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { showZWaveJSAddNodeDialog } from "../../panels/config/integrations/integration-panels/zwave_js/show-dialog-zwave_js-add-node";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { isComponentLoaded } from "../config/is_component_loaded";
import { navigate } from "../navigate";

export const protocolIntegrationPicked = async (
  element: HTMLElement,
  hass: HomeAssistant,
  slug: string
) => {
  if (slug === "zwave_js") {
    const entries = await getConfigEntries(hass, {
      domain: "zwave_js",
    });

    if (!isComponentLoaded(hass, "zwave_js") || !entries.length) {
      // If the component isn't loaded, ask them to load the integration first
      showConfirmationDialog(element, {
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee",
          {
            integration: "Z-Wave",
            supported_hardware_link: html`<a
              href=${documentationUrl(hass, "/docs/z-wave/controllers")}
              target="_blank"
              rel="noreferrer"
              >${hass.localize(
                "ui.panel.config.integrations.config_flow.supported_hardware"
              )}</a
            >`,
          }
        ),
        confirmText: hass.localize(
          "ui.panel.config.integrations.config_flow.proceed"
        ),
        confirm: () => {
          showConfigFlowDialog(element, {
            startFlowHandler: "zwave_js",
          });
        },
      });
      return;
    }

    showZWaveJSAddNodeDialog(element, {
      entry_id: entries[0].entry_id,
    });
  } else if (slug === "zha") {
    // If the component isn't loaded, ask them to load the integration first
    if (!isComponentLoaded(hass, "zha")) {
      showConfirmationDialog(element, {
        text: hass.localize(
          "ui.panel.config.integrations.config_flow.missing_zwave_zigbee",
          {
            integration: "Zigbee",
            supported_hardware_link: html`<a
              href=${documentationUrl(
                hass,
                "/integrations/zha/#known-working-zigbee-radio-modules"
              )}
              target="_blank"
              rel="noreferrer"
              >${hass.localize(
                "ui.panel.config.integrations.config_flow.supported_hardware"
              )}</a
            >`,
          }
        ),
        confirmText: hass.localize(
          "ui.panel.config.integrations.config_flow.proceed"
        ),
        confirm: () => {
          showConfigFlowDialog(element, {
            startFlowHandler: "zha",
          });
        },
      });
      return;
    }

    navigate("/config/zha/add");
  }
};
