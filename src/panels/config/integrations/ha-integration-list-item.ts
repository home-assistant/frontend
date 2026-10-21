import {
  mdiFileCodeOutline,
  mdiPackageVariant,
  mdiPlus,
  mdiWeb,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-label";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { HaListItemButton } from "../../../components/item/ha-list-item-button";
import { domainToName } from "../../../data/integration";
import type { IntegrationListItem } from "./dialog-add-integration";

@customElement("ha-integration-list-item")
export class HaIntegrationListItem extends HaListItemButton {
  @property({ attribute: false }) public integration!: IntegrationListItem;

  // A bordered card with room around it, like the automation editor's items.
  // The room is padding, not margin, so a virtualized list measures it.
  @property({ type: Boolean, reflect: true }) public card = false;

  // Picking it closes the dialog and starts adding, instead of a next step
  @property({ type: Boolean, attribute: "opens-flow" }) public opensFlow =
    false;

  // Something of it was found, so picking it shows that first
  @property({ type: Boolean }) public discovered = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected override _renderStart(): TemplateResult {
    const integration = this.integration;
    return html`
      <div part="start" class="start">
        ${
          integration.icon
            ? html`<ha-icon .icon=${integration.icon}></ha-icon>`
            : html`<ha-domain-icon
                brand-fallback
                .domain=${integration.domain}
              ></ha-domain-icon>`
        }
      </div>
    `;
  }

  protected override _renderContent(): TemplateResult {
    const integration = this.integration;
    return html`
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
        ${
          integration.description
            ? html`<div part="supporting-text" class="supporting">
                ${integration.description}
              </div>`
            : nothing
        }
      </div>
    `;
  }

  protected override _renderEnd(): TemplateResult {
    const integration = this.integration;
    const yamlOnly =
      !integration.config_flow &&
      !integration.integrations &&
      !integration.iot_standards;
    return html`
      <div part="end" class="end">
        ${
          this.discovered
            ? html`<ha-label dense>
                ${this._localize("ui.panel.config.integrations.discovered")}
              </ha-label>`
            : nothing
        }
        ${
          integration.cloud
            ? html`<ha-svg-icon
                  id="icon-cloud"
                  class="status"
                  .path=${mdiWeb}
                ></ha-svg-icon>
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
                  class=${`status ${
                    integration.overwrites_built_in ? "overwrites" : "custom"
                  }`}
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
                  class="open-in-new action"
                ></ha-svg-icon>
                <ha-tooltip for="icon-yaml" placement="left">
                  ${this._localize(
                    "ui.panel.config.integrations.config_entry.yaml_only"
                  )}
                </ha-tooltip>`
            : this.opensFlow
              ? html`<ha-svg-icon
                  class="add action"
                  .path=${mdiPlus}
                ></ha-svg-icon>`
              : html`<ha-icon-next class="action"></ha-icon-next>`
        }
      </div>
    `;
  }

  static styles: CSSResultGroup = [
    HaListItemButton.styles,
    css`
      :host([card]) {
        padding: 0 var(--ha-space-4) var(--ha-space-2);
        box-sizing: border-box;
        --ha-list-item-focus-radius: var(--ha-border-radius-lg);
      }
      :host([card]) .base {
        border: 1px solid var(--ha-color-border-neutral-quiet);
        border-radius: var(--ha-border-radius-lg);
        overflow: hidden;
      }
      .start {
        --mdc-icon-size: 32px;
        height: 32px;
      }
      /* The brand image is inline, its line box would push it off center */
      .start ha-domain-icon {
        display: flex;
      }
      .end {
        color: var(--ha-color-text-secondary);
        display: flex;
        align-items: center;
        gap: var(--ha-space-1);
      }
      /* Raise the icons above the row's hit area so their tooltips open */
      .end ha-svg-icon {
        position: relative;
        z-index: 1;
      }
      /* Small notes on the integration, apart from what picking it does */
      .end .status {
        --mdc-icon-size: 20px;
      }
      .end .action {
        margin-inline-start: var(--ha-space-2);
      }
      /* Decorative, below the row's hit area; like the tree chevrons of the
         automation editor */
      .end ha-icon-next {
        z-index: -1;
        color: var(--ha-color-on-neutral-quiet);
      }
      .end ha-label {
        border: none;
        --ha-label-background-color: var(
          --ha-color-fill-primary-normal-resting
        );
        --ha-label-text-color: var(--ha-color-on-primary-normal);
      }
      .end .add {
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
