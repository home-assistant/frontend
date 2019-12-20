import {
  LitElement,
  TemplateResult,
  html,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { HomeAssistant } from "../../../../types";

import "../../../../components/entity/state-badge";

import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-switch";
import { showEntityRegistryDetailDialog } from "../../entity_registry/show-dialog-entity-registry-detail";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
// tslint:disable-next-line
import { HaSwitch } from "../../../../components/ha-switch";
import { EntityRegistryStateEntry } from "../ha-config-device-page";
import { addEntitiesToLovelaceView } from "../../../lovelace/editor/add-entities-to-view";

@customElement("ha-device-entities-card")
export class HaDeviceEntitiesCard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public deviceId!: string;
  @property() public entities!: EntityRegistryStateEntry[];
  @property() public narrow!: boolean;
  @property() private _showDisabled = false;

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <paper-item>
          <ha-switch
            ?checked=${this._showDisabled}
            @change=${this._showDisabledChanged}
            >${this.hass.localize(
              "ui.panel.config.entity_registry.picker.show_disabled"
            )}
          </ha-switch>
        </paper-item>
        ${this.entities.length
          ? html`
              ${this.entities.map((entry: EntityRegistryStateEntry) => {
                if (!this._showDisabled && entry.disabled_by) {
                  return "";
                }
                const stateObj = this.hass.states[entry.entity_id];
                return html`
                  <paper-icon-item
                    .entry=${entry}
                    class=${classMap({ "disabled-entry": !!entry.disabled_by })}
                  >
                    ${stateObj
                      ? html`
                          <state-badge
                            @click=${this._openMoreInfo}
                            .stateObj=${stateObj}
                            slot="item-icon"
                          ></state-badge>
                        `
                      : html`
                          <ha-icon
                            slot="item-icon"
                            .icon=${domainIcon(computeDomain(entry.entity_id))}
                          ></ha-icon>
                        `}
                    <paper-item-body two-line @click=${this._openMoreInfo}>
                      <div class="name">${entry.stateName}</div>
                      <div class="secondary entity-id">${entry.entity_id}</div>
                    </paper-item-body>
                    <div class="buttons">
                      ${stateObj
                        ? html`
                            <paper-icon-button
                              @click=${this._openMoreInfo}
                              icon="hass:information-outline"
                            ></paper-icon-button>
                          `
                        : ""}
                      <paper-icon-button
                        @click=${this._openEditEntry}
                        icon="hass:settings"
                      ></paper-icon-button>
                    </div>
                  </paper-icon-item>
                `;
              })}
              <div class="card-actions">
                <mwc-button @click=${this._addToLovelaceView}>
                  ${this.hass.localize(
                    "ui.panel.config.devices.entities.add_entities_lovelace"
                  )}
                </mwc-button>
              </div>
            `
          : html`
              <div class="config-entry-row">
                <paper-item-body two-line>
                  <div>
                    ${this.hass.localize(
                      "ui.panel.config.devices.entities.none"
                    )}
                  </div>
                </paper-item-body>
              </div>
            `}
      </ha-card>
    `;
  }

  private _showDisabledChanged(ev: Event) {
    this._showDisabled = (ev.target as HaSwitch).checked;
  }

  private _openEditEntry(ev: MouseEvent): void {
    const entry = (ev.currentTarget! as any).closest("paper-icon-item").entry;
    showEntityRegistryDetailDialog(this, {
      entry,
    });
  }

  private _openMoreInfo(ev: MouseEvent) {
    const entry = (ev.currentTarget! as any).closest("paper-icon-item").entry;
    fireEvent(this, "hass-more-info", { entityId: entry.entity_id });
  }

  private _addToLovelaceView(): void {
    addEntitiesToLovelaceView(
      this,
      this.hass,
      this.entities.map((entity) => entity.entity_id)
    );
  }

  static get styles(): CSSResult {
    return css`
      ha-icon {
        width: 40px;
      }
      .entity-id {
        color: var(--secondary-text-color);
      }
      .buttons {
        text-align: right;
        margin: 0 0 0 8px;
      }
      .disabled-entry {
        color: var(--secondary-text-color);
      }
      state-badge {
        cursor: pointer;
      }
      paper-icon-item:not(.disabled-entry) paper-item-body {
        cursor: pointer;
      }
    `;
  }
}
