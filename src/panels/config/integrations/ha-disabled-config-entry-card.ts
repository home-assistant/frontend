import { mdiCog } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-button";
import {
  DisableConfigEntryResult,
  enableConfigEntry,
} from "../../../data/config_entries";
import type { IntegrationManifest } from "../../../data/integration";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import "./ha-integration-action-card";

@customElement("ha-disabled-config-entry-card")
export class HaDisabledConfigEntryCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entry!: ConfigEntryExtended;

  @property() public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    return html`
      <ha-integration-action-card
        .hass=${this.hass}
        .manifest=${this.manifest}
        .banner=${this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable.disabled_cause",
          {
            cause:
              this.hass.localize(
                `ui.panel.config.integrations.config_entry.disable.disabled_by.${this
                  .entry.disabled_by!}`
              ) || this.entry.disabled_by,
          }
        )}
        .domain=${this.entry.domain}
        .localizedDomainName=${this.entry.localized_domain_name}
        .label=${this.entry.title || this.entry.localized_domain_name}
      >
        <a
          href=${`/config/integrations/integration/${this.entry.domain}`}
          slot="header-button"
        >
          <ha-icon-button .path=${mdiCog}></ha-icon-button>
        </a>
        <ha-button
          @click=${this._handleEnable}
          .label=${this.hass.localize("ui.common.enable")}
        ></ha-button>
      </ha-integration-action-card>
    `;
  }

  private async _handleEnable() {
    const entryId = this.entry.entry_id;

    let result: DisableConfigEntryResult;
    try {
      result = await enableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.enable_restart_confirm"
        ),
      });
    }
  }

  static styles = css`
    :host {
      --state-color: var(--divider-color, #e0e0e0);
    }

    ha-button {
      --mdc-theme-primary: var(--primary-color);
    }
    a ha-icon-button {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-disabled-config-entry-card": HaDisabledConfigEntryCard;
  }
}
