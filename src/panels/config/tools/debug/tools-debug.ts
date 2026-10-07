import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../../common/entity/compute_domain";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-card";
import "../../../../components/ha-yaml-editor";
import "../../../../components/list/ha-list-base";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import { getExtendedEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import {
  getStatisticMetadata,
  validateStatistics,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import "./ha-debug-connection-row";
import "./ha-debug-disable-view-transition-row";
import "./ha-debug-viewport-environment-card";

@customElement("tools-debug")
class HaPanelDevDebug extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId?: string;

  @state() private _entityDiagnostic?: Record<string, unknown>;

  protected render() {
    return html`
      <div class="content">
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.title"
          )}
        >
          <ha-list-base>
            <ha-debug-connection-row
              .hass=${this.hass}
            ></ha-debug-connection-row>
            <ha-debug-disable-view-transition-row
              .hass=${this.hass}
            ></ha-debug-disable-view-transition-row>
          </ha-list-base>
        </ha-card>
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.config.tools.tabs.debug.entity_diagnostic.title"
          )}
        >
          <div class="card-content">
            <ha-entity-picker
              .helper=${this.hass.localize(
                "ui.panel.config.tools.tabs.debug.entity_diagnostic.description"
              )}
              @value-changed=${this._entityPicked}
            ></ha-entity-picker>
          </div>
          ${
            this._entityDiagnostic
              ? html`<ha-yaml-editor
                  .value=${this._entityDiagnostic}
                  read-only
                  auto-update
                  copy-clipboard
                ></ha-yaml-editor>`
              : nothing
          }
        </ha-card>
        <ha-debug-viewport-environment-card
          .hass=${this.hass}
        ></ha-debug-viewport-environment-card>
      </div>
    `;
  }

  private async _entityPicked(ev: ValueChangedEvent<string | undefined>) {
    const id = ev.detail.value;
    this._entityId = id;
    this._entityDiagnostic = undefined;
    if (!id) {
      return;
    }
    let statistic;
    if (computeDomain(id) === "sensor") {
      const [metadata, issues] = await Promise.all([
        getStatisticMetadata(this.hass.callWS, [id]),
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
    let entity: ExtEntityRegistryEntry | undefined;
    try {
      entity = await getExtendedEntityRegistryEntry(this.hass, id);
    } catch {
      // not in the registry
    }
    if (this._entityId !== id) {
      // A different entity was picked while loading
      return;
    }
    const device = entity?.device_id && this.hass.devices[entity.device_id];

    this._entityDiagnostic = {
      state: this.hass.states[id],
      entity,
      device,
      statistic,
    };
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
    "tools-debug": HaPanelDevDebug;
  }
}
