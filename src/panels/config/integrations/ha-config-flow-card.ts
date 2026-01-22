import {
  mdiBookshelf,
  mdiCog,
  mdiDelete,
  mdiDotsVertical,
  mdiOpenInNew,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../components/ha-dropdown-item";
import {
  deleteApplicationCredential,
  fetchApplicationCredentialsConfigEntry,
} from "../../../data/application_credential";
import { deleteConfigEntry } from "../../../data/config_entries";
import {
  ATTENTION_SOURCES,
  DISCOVERY_SOURCES,
  ignoreConfigFlow,
  localizeConfigFlowTitle,
} from "../../../data/config_flow";
import type { IntegrationManifest } from "../../../data/integration";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { DataEntryFlowProgressExtended } from "./ha-config-integrations";
import "./ha-integration-action-card";

@customElement("ha-config-flow-card")
export class HaConfigFlowCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public flow!: DataEntryFlowProgressExtended;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    const attention = ATTENTION_SOURCES.includes(this.flow.context.source);
    return html`
      <ha-integration-action-card
        class=${classMap({
          attention: attention,
        })}
        .hass=${this.hass}
        .manifest=${this.manifest}
        .domain=${this.flow.handler}
        .label=${this.flow.localized_title ?? ""}
      >
        ${DISCOVERY_SOURCES.includes(this.flow.context.source) &&
        this.flow.context.unique_id
          ? html`<ha-button appearance="plain" @click=${this._ignoreFlow}
              >${this.hass.localize(
                "ui.panel.config.integrations.ignore.ignore"
              )}</ha-button
            >`
          : nothing}
        <ha-button
          @click=${this._continueFlow}
          variant=${attention ? "danger" : "brand"}
          appearance="filled"
        >
          ${this.hass.localize(
            attention
              ? "ui.panel.config.integrations.reconfigure"
              : "ui.common.add"
          )}
        </ha-button>
        ${this.flow.context.configuration_url || this.manifest || attention
          ? html`<ha-dropdown
              slot="header-button"
              placement="bottom-end"
              @wa-select=${this._handleDropdownSelect}
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              ${this.flow.context.configuration_url
                ? html`<a
                    href=${this.flow.context.configuration_url.replace(
                      /^homeassistant:\/\//,
                      "/"
                    )}
                    rel="noreferrer"
                    target=${this.flow.context.configuration_url.startsWith(
                      "homeassistant://"
                    )
                      ? "_self"
                      : "_blank"}
                  >
                    <ha-dropdown-item>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.open_configuration_url"
                      )}
                      <ha-svg-icon slot="icon" .path=${mdiCog}></ha-svg-icon>
                      <ha-svg-icon
                        slot="details"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </ha-dropdown-item>
                  </a>`
                : nothing}
              ${this.manifest
                ? html`<a
                    href=${this.manifest.is_built_in
                      ? documentationUrl(
                          this.hass,
                          `/integrations/${this.manifest.domain}`
                        )
                      : this.manifest.documentation}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ha-dropdown-item>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.documentation"
                      )}
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiBookshelf}
                      ></ha-svg-icon>
                      <ha-svg-icon
                        slot="details"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </ha-dropdown-item>
                  </a>`
                : nothing}
              ${attention
                ? html`<ha-dropdown-item variant="danger" value="delete">
                    <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.delete"
                    )}
                  </ha-dropdown-item>`
                : nothing}
            </ha-dropdown>`
          : nothing}
      </ha-integration-action-card>
    `;
  }

  private _continueFlow() {
    if (this.flow.flow_id === "external") {
      this.hass.auth.external!.fireMessage({
        type: "improv/configure_device",
        payload: {
          name:
            this.flow.localized_title ||
            this.flow.context.title_placeholders.name,
        },
      });
      return;
    }
    showConfigFlowDialog(this, {
      continueFlowId: this.flow.flow_id,
      navigateToResult: true,
      dialogClosedCallback: () => {
        this._handleFlowUpdated();
      },
    });
  }

  private async _ignoreFlow() {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore_title",
        { name: localizeConfigFlowTitle(this.hass.localize, this.flow) }
      ),
      text: this.hass!.localize(
        "ui.panel.config.integrations.ignore.confirm_ignore"
      ),
      confirmText: this.hass!.localize(
        "ui.panel.config.integrations.ignore.ignore"
      ),
    });
    if (!confirmed) {
      return;
    }
    await ignoreConfigFlow(
      this.hass,
      this.flow.flow_id,
      localizeConfigFlowTitle(this.hass.localize, this.flow)
    );
    this._handleFlowUpdated();
  }

  private _handleFlowUpdated() {
    fireEvent(this, "change", undefined, {
      bubbles: false,
    });
  }

  // Return an application credentials id for this config entry to prompt the
  // user for removal. This is best effort so we don't stop overall removal
  // if the integration isn't loaded or there is some other error.
  private async _fetchApplicationCredentials(entryId: string) {
    try {
      return (await fetchApplicationCredentialsConfigEntry(this.hass, entryId))
        .application_credentials_id;
    } catch (_err: any) {
      // We won't prompt the user to remove credentials
      return null;
    }
  }

  private async _removeApplicationCredential(applicationCredentialsId: string) {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.application_credentials.delete_title"
      ),
      text: html`${this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_prompt"
        )},
        <br />
        <br />
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_detail"
        )}
        <br />
        <br />
        <a
          href="https://www.home-assistant.io/integrations/application_credentials"
          target="_blank"
          rel="noreferrer"
        >
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.application_credentials.learn_more"
          )}
        </a>`,
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteApplicationCredential(this.hass, applicationCredentialsId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_error_title"
        ),
        text: err.message,
      });
    }
  }

  private _handleDelete = async () => {
    const entryId = this.flow.context.entry_id;

    if (!entryId) {
      // This shouldn't happen for reauth flows, but handle gracefully
      return;
    }

    const applicationCredentialsId =
      await this._fetchApplicationCredentials(entryId);

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_title",
        { title: localizeConfigFlowTitle(this.hass.localize, this.flow) }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    const result = await deleteConfigEntry(this.hass, entryId);

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.restart_confirm"
        ),
      });
    }

    if (applicationCredentialsId) {
      this._removeApplicationCredential(applicationCredentialsId);
    }

    this._handleFlowUpdated();
  };

  private _handleDropdownSelect(ev: CustomEvent<{ item: HaDropdownItem }>) {
    const action = ev.detail?.item?.value;

    if (action === "delete") {
      this._handleDelete();
    }
  }

  static styles = css`
    a {
      text-decoration: none;
      color: var(--primary-color);
    }
    ha-dropdown {
      color: var(--secondary-text-color);
    }
    ha-svg-icon[slot="meta"] {
      width: 18px;
      height: 18px;
    }
    .attention {
      --mdc-theme-primary: var(--error-color);
      --ha-card-border-color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-flow-card": HaConfigFlowCard;
  }
}
