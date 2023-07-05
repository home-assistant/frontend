import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { deleteConfigEntry } from "../../../data/config_entries";
import type { IntegrationManifest } from "../../../data/integration";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import type { ConfigEntryExtended } from "./ha-config-integrations";
import "./ha-integration-action-card";
import "../../../components/ha-button";

@customElement("ha-ignored-config-entry-card")
export class HaIgnoredConfigEntryCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entry!: ConfigEntryExtended;

  @property() public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    return html`
      <ha-integration-action-card
        .hass=${this.hass}
        .manifest=${this.manifest}
        .banner=${this.hass.localize(
          "ui.panel.config.integrations.ignore.ignored"
        )}
        .domain=${this.entry.domain}
        .localizedDomainName=${this.entry.localized_domain_name}
        .label=${this.entry.title === "Ignored"
          ? // In 2020.2 we added support for entry.title. All ignored entries before
            // that have title "Ignored" so we fallback to localized domain name.
            this.entry.localized_domain_name
          : this.entry.title}
      >
        <ha-button
          @click=${this._removeIgnoredIntegration}
          .label=${this.hass.localize(
            "ui.panel.config.integrations.ignore.stop_ignore"
          )}
        ></ha-button>
      </ha-integration-action-card>
    `;
  }

  private async _removeIgnoredIntegration() {
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_delete_ignore_title",
        "name",
        this.hass.localize(`component.${this.entry.domain}.title`)
      ),
      text: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_delete_ignore"
      ),
      confirmText: this.hass!.localize(
        "ui.panel.config.integrations.ignore.stop_ignore"
      ),
      confirm: async () => {
        const result = await deleteConfigEntry(this.hass, this.entry.entry_id);
        if (result.require_restart) {
          alert(
            this.hass.localize(
              "ui.panel.config.integrations.config_entry.restart_confirm"
            )
          );
        }
        fireEvent(this, "change", undefined, {
          bubbles: false,
        });
      },
    });
  }

  static styles = css`
    :host {
      --state-color: var(--divider-color, #e0e0e0);
    }

    ha-button {
      --mdc-theme-primary: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-ignored-config-entry-card": HaIgnoredConfigEntryCard;
  }
}
