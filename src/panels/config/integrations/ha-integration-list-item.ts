import {
  mdiDevices,
  mdiFileCodeOutline,
  mdiPackageVariant,
  mdiWeb,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { HaListItemButton } from "../../../components/item/ha-list-item-button";
import { domainToName } from "../../../data/integration";
import type { IntegrationListItem } from "./dialog-add-integration";

@customElement("ha-integration-list-item")
export class HaIntegrationListItem extends HaListItemButton {
  @property({ attribute: false }) public integration!: IntegrationListItem;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected override _renderInner(): TemplateResult {
    const integration = this.integration;
    const yamlOnly =
      !integration.config_flow &&
      !integration.integrations &&
      !integration.iot_standards;
    return html`
      <div part="start" class="start">
        ${
          integration.is_discovered
            ? html`<ha-svg-icon
                class="discovered-icon"
                .path=${mdiDevices}
              ></ha-svg-icon>`
            : html`<ha-domain-icon
                brand-fallback
                .domain=${integration.domain}
              ></ha-domain-icon>`
        }
      </div>
      <div part="content" class="content">
        <div part="headline" class="headline">
          ${
            integration.name || domainToName(this._localize, integration.domain)
          }
          ${
            integration.is_helper
              ? ` (${this._localize("ui.panel.config.integrations.config_entry.helper")})`
              : nothing
          }
        </div>
      </div>
      <div part="end" class="end">
        ${
          integration.cloud
            ? html`<ha-svg-icon id="icon-cloud" .path=${mdiWeb}></ha-svg-icon>
                <ha-tooltip for="icon-cloud" placement="left">
                  ${this._localize(
                    "ui.panel.config.integrations.config_entry.depends_on_cloud"
                  )}
                </ha-tooltip>`
            : nothing
        }
        ${
          !integration.is_built_in
            ? html`<ha-svg-icon
                  id="icon-custom"
                  class=${
                    integration.overwrites_built_in ? "overwrites" : "custom"
                  }
                  .path=${mdiPackageVariant}
                ></ha-svg-icon>
                <ha-tooltip for="icon-custom" placement="left">
                  ${this._localize(
                    integration.overwrites_built_in
                      ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                      : "ui.panel.config.integrations.config_entry.custom_integration"
                  )}
                </ha-tooltip>`
            : nothing
        }
        ${
          yamlOnly
            ? html`<ha-svg-icon
                  id="icon-yaml"
                  .path=${mdiFileCodeOutline}
                  class="open-in-new"
                ></ha-svg-icon>
                <ha-tooltip for="icon-yaml" placement="left">
                  ${this._localize(
                    "ui.panel.config.integrations.config_entry.yaml_only"
                  )}
                </ha-tooltip>`
            : html`<ha-icon-next></ha-icon-next>`
        }
      </div>
    `;
  }

  static styles: CSSResultGroup = [
    HaListItemButton.styles,
    css`
      .start {
        --mdc-icon-size: 32px;
        height: 32px;
      }
      .end {
        color: var(--ha-color-text-secondary);
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
      }
      .discovered-icon {
        color: var(--primary-color);
      }
      .open-in-new {
        --mdc-icon-size: 22px;
        padding: 1px;
      }
      .end .custom {
        color: var(--warning-color);
      }
      .end .overwrites {
        color: var(--error-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-list-item": HaIntegrationListItem;
  }
}
