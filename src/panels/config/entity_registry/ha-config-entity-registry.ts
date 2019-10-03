import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";

import { HomeAssistant } from "../../../types";
import {
  EntityRegistryEntry,
  computeEntityRegistryName,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-switch";
import { domainIcon } from "../../../common/entity/domain_icon";
import { stateIcon } from "../../../common/entity/state_icon";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../ha-config-section";
import {
  showEntityRegistryDetailDialog,
  loadEntityRegistryDetailDialog,
} from "./show-dialog-entity-registry-detail";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { compare } from "../../../common/string/compare";
import { classMap } from "lit-html/directives/class-map";
// tslint:disable-next-line
import { HaSwitch } from "../../../components/ha-switch";
import memoize from "memoize-one";

class HaConfigEntityRegistry extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _entities?: EntityRegistryEntry[];
  @property() private _showDisabled = false;
  private _unsubEntities?: UnsubscribeFunc;

  private _filteredEntities = memoize(
    (entities: EntityRegistryEntry[], showDisabled: boolean) =>
      showDisabled
        ? entities
        : entities.filter((entity) => !Boolean(entity.disabled_by))
  );

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
            <paper-item>
              <ha-switch
                ?checked=${this._showDisabled}
                @change=${this._showDisabledChanged}
                >${this.hass.localize(
                  "ui.panel.config.entity_registry.picker.show_disabled"
                )}</ha-switch
              ></paper-item
            >
            ${this._filteredEntities(this._entities, this._showDisabled).map(
              (entry) => {
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
                          `(${this.hass!.localize(
                            "state.default.unavailable"
                          )})`}
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
              }
            )}
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

  private _showDisabledChanged(ev: Event) {
    this._showDisabled = (ev.target as HaSwitch).checked;
  }

  private _openEditEntry(ev: MouseEvent): void {
    const entry = (ev.currentTarget! as any).entry;
    showEntityRegistryDetailDialog(this, {
      entry,
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
