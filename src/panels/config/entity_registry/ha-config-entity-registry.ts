import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

import { HomeAssistant } from "../../../types";
import {
  EntityRegistryEntry,
  computeEntityRegistryName,
  updateEntityRegistryEntry,
  removeEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import domainIcon from "../../../common/entity/domain_icon";
import stateIcon from "../../../common/entity/state_icon";
import computeDomain from "../../../common/entity/compute_domain";
import "../ha-config-section";
import {
  showEntityRegistryDetailDialog,
  loadEntityRegistryDetailDialog,
} from "./show-dialog-entity-registry-detail";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { compare } from "../../../common/string/compare";
import { classMap } from "lit-html/directives/class-map";

class HaConfigEntityRegistry extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _entities?: EntityRegistryEntry[];
  private _unsubEntities?: UnsubscribeFunc;

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEntities) {
      this._unsubEntities();
    }
  }

  protected render(): TemplateResult | void {
    if (!this.hass || this._entities === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    return html`
      <hass-subpage
        header="${this.hass.localize(
          "ui.panel.config.entity_registry.caption"
        )}"
      >
        <ha-config-section .isWide=${this.isWide}>
          <span slot="header">
            ${this.hass.localize(
              "ui.panel.config.entity_registry.picker.header"
            )}
          </span>
          <span slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.entity_registry.picker.introduction"
            )}
            <p>
              ${this.hass.localize(
                "ui.panel.config.entity_registry.picker.introduction2"
              )}
            </p>
            <a href="/config/integrations">
              ${this.hass.localize(
                "ui.panel.config.entity_registry.picker.integrations_page"
              )}
            </a>
          </span>
          <ha-card>
            ${this._entities.map((entry) => {
              const state = this.hass!.states[entry.entity_id];
              return html`
                <paper-icon-item
                  @click=${this._openEditEntry}
                  .entry=${entry}
                  class=${classMap({ "disabled-entry": !!entry.disabled_by })}
                >
                  <ha-icon
                    slot="item-icon"
                    .icon=${state
                      ? stateIcon(state)
                      : domainIcon(computeDomain(entry.entity_id))}
                  ></ha-icon>
                  <paper-item-body two-line>
                    <div class="name">
                      ${computeEntityRegistryName(this.hass!, entry) ||
                        `(${this.hass!.localize("state.default.unavailable")})`}
                    </div>
                    <div class="secondary entity-id">
                      ${entry.entity_id}
                    </div>
                  </paper-item-body>
                  <div class="platform">
                    ${entry.platform}
                    ${entry.disabled_by
                      ? html`
                          <br />(disabled)
                        `
                      : ""}
                  </div>
                </paper-icon-item>
              `;
            })}
          </ha-card>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    loadEntityRegistryDetailDialog();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (!this._unsubEntities) {
      this._unsubEntities = subscribeEntityRegistry(
        this.hass.connection,
        (entities) => {
          this._entities = entities.sort((ent1, ent2) =>
            compare(ent1.entity_id, ent2.entity_id)
          );
        }
      );
    }
  }

  private _openEditEntry(ev: MouseEvent): void {
    const entry = (ev.currentTarget! as any).entry;
    showEntityRegistryDetailDialog(this, {
      entry,
      updateEntry: async (updates) => {
        const updated = await updateEntityRegistryEntry(
          this.hass!,
          entry.entity_id,
          updates
        );
        this._entities = this._entities!.map((ent) =>
          ent === entry ? updated : ent
        );
      },
      removeEntry: async () => {
        if (
          !confirm(`Are you sure you want to delete this entry?

Deleting an entry will not remove the entity from Home Assistant. To do this, you will need to remove the integration "${
            entry.platform
          }" from Home Assistant.`)
        ) {
          return false;
        }

        try {
          await removeEntityRegistryEntry(this.hass!, entry.entity_id);
          this._entities = this._entities!.filter((ent) => ent !== entry);
          return true;
        } catch (err) {
          return false;
        }
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      ha-card {
        margin-bottom: 24px;
        direction: ltr;
      }
      paper-icon-item {
        cursor: pointer;
        color: var(--primary-text-color);
      }
      ha-icon {
        margin-left: 8px;
      }
      .platform {
        text-align: right;
        margin: 0 0 0 8px;
      }
      .disabled-entry {
        color: var(--secondary-text-color);
      }
    `;
  }
}

customElements.define("ha-config-entity-registry", HaConfigEntityRegistry);
