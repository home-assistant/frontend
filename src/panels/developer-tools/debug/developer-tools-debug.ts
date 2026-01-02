import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/entity/ha-entity-picker";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./ha-debug-connection-row";
import {
  getStatisticMetadata,
  validateStatistics,
} from "../../../data/recorder";
import { computeDomain } from "../../../common/entity/compute_domain";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import { showToast } from "../../../util/toast";
import { getExtendedEntityRegistryEntry } from "../../../data/entity/entity_registry";

@customElement("developer-tools-debug")
class HaPanelDevDebug extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _entityId?: string;

  protected render() {
    return html`
      <div class="content">
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.title"
          )}
        >
          <ha-debug-connection-row
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ha-debug-connection-row>
        </ha-card>
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.entity_diagnostic.title"
          )}
        >
          <div class="card-content">
            <ha-entity-picker
              .hass=${this.hass}
              .helper=${this.hass.localize(
                "ui.panel.developer-tools.tabs.debug.entity_diagnostic.description"
              )}
              @value-changed=${this._entityPicked}
            ></ha-entity-picker>
          </div>
          <div class="card-actions">
            <ha-button
              @click=${this._copyEntityDiagnostic}
              appearance="filled"
              .disabled=${!this._entityId}
              >${this.hass.localize(
                "ui.panel.developer-tools.tabs.debug.entity_diagnostic.copy_to_clipboard"
              )}</ha-button
            >
          </div>
        </ha-card>
      </div>
    `;
  }

  private async _copyEntityDiagnostic() {
    const id = this._entityId!;
    let statistic;
    if (computeDomain(id) === "sensor") {
      const [metadata, issues] = await Promise.all([
        getStatisticMetadata(this.hass, [id]),
        validateStatistics(this.hass),
      ]);
      const issue = issues[id];
      if (metadata || issue) {
        statistic = {
          metadata,
          issue,
        };
      }
    }

    const entity = await getExtendedEntityRegistryEntry(this.hass, id);
    const device = entity?.device_id && this.hass.devices[entity.device_id];

    const data = {
      state: this.hass.states[id],
      entity,
      device,
      statistic,
    };
    const json = JSON.stringify(data, null, 2);
    await copyToClipboard(json);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _entityPicked(ev) {
    this._entityId = ev.detail.value;
  }

  static styles = [
    haStyle,
    css`
      ha-card {
        margin-bottom: var(--ha-space-4);
      }
      .card-content {
        padding: var(--ha-space-2);
      }
      .content {
        padding: var(--ha-space-7) var(--ha-space-5) var(--ha-space-4);
        display: block;
        max-width: 600px;
        margin: 0 auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-debug": HaPanelDevDebug;
  }
}
