import { mdiPackageVariant, mdiCloud } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, html } from "lit-element";
import { IntegrationManifest } from "../../../data/integration";
import { HomeAssistant } from "../../../types";

export const haConfigIntegrationsStyles = css`
  .banner {
    background-color: var(--state-color);
    color: var(--text-on-state-color);
    text-align: center;
    padding: 8px;
  }
  .icons {
    position: absolute;
    top: 0px;
    right: 16px;
    color: var(--text-on-state-color, var(--secondary-text-color));
    background-color: var(--state-color, #e0e0e0);
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    padding: 1px 4px 2px;
  }
  .icons ha-svg-icon {
    width: 20px;
    height: 20px;
  }
  paper-tooltip {
    white-space: nowrap;
  }
`;

export const haConfigIntegrationRenderIcons = (
  hass: HomeAssistant,
  manifest?: IntegrationManifest
) => {
  const icons: [string, string][] = [];

  if (manifest) {
    if (!manifest.is_built_in) {
      icons.push([
        mdiPackageVariant,
        hass.localize(
          "ui.panel.config.integrations.config_entry.provided_by_custom_component"
        ),
      ]);
    }

    if (manifest.iot_class && manifest.iot_class.startsWith("cloud_")) {
      icons.push([
        mdiCloud,
        hass.localize(
          "ui.panel.config.integrations.config_entry.depends_on_cloud"
        ),
      ]);
    }
  }

  return icons.length === 0
    ? ""
    : html`
        <div class="icons">
          ${icons.map(
            ([icon, description]) => html`
              <span>
                <ha-svg-icon .path=${icon}></ha-svg-icon>
                <paper-tooltip animation-delay="0"
                  >${description}</paper-tooltip
                >
              </span>
            `
          )}
        </div>
      `;
};
