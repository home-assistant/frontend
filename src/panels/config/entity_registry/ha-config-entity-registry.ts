import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
} from "lit-element";

import { HomeAssistant } from "../../../types";
import {
  EntityRegistryEntry,
  computeEntityRegistryName,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import "../../../layouts/hass-subpage";
import "../../../layouts/hass-loading-screen";
import "../../../components/data-table/ha-data-table";
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
// tslint:disable-next-line
import { HaSwitch } from "../../../components/ha-switch";
import memoize from "memoize-one";
// tslint:disable-next-line
import {
  DataTabelColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";

class HaConfigEntityRegistry extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _entities?: EntityRegistryEntry[];
  @property() private _showDisabled = false;
  private _unsubEntities?: UnsubscribeFunc;

  private _filteredEntities = memoize(
    (entities: EntityRegistryEntry[], showDisabled: boolean) =>
      (showDisabled
        ? entities
        : entities.filter((entity) => !Boolean(entity.disabled_by))
      ).map((entry) => {
        const state = this.hass!.states[entry.entity_id];
        return {
          ...entry,
          icon: state
            ? stateIcon(state)
            : domainIcon(computeDomain(entry.entity_id)),
          name:
            computeEntityRegistryName(this.hass!, entry) ||
            this.hass!.localize("state.default.unavailable"),
          enabled: !entry.disabled_by,
          id: entry.entity_id,
        };
      })
  );

  private _columns = memoize(
    (): DataTabelColumnContainer => {
      return {
        icon: {
          title: "",
          template: (icon) => html`
            <ha-icon slot="item-icon" .icon=${icon}></ha-icon>
          `,
        },
        name: {
          title: "Name",
          sortable: true,
          filterable: true,
          direction: "asc",
        },
        entity_id: {
          title: "Entity id",
          sortable: true,
          filterable: true,
        },
        platform: {
          title: "Platform",
          sortable: true,
          filterable: true,
        },
        enabled: {
          title: "Enabled",
          sortable: true,
          template: (enabled) => html`
            <ha-icon
              slot="item-icon"
              icon=${enabled ? "ha:check-circle-outline" : "ha:cancel"}
            ></ha-icon>
          `,
        },
      };
    }
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
          <ha-switch
            ?checked=${this._showDisabled}
            @change=${this._showDisabledChanged}
            >${this.hass.localize(
              "ui.panel.config.entity_registry.picker.show_disabled"
            )}</ha-switch
          >
          <ha-data-table
            .columns=${this._columns()}
            .data=${this._filteredEntities(this._entities, this._showDisabled)}
            @row-click=${this._openEditEntry}
          >
          </ha-data-table>
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
          this._entities = entities;
        }
      );
    }
  }

  private _showDisabledChanged(ev: Event) {
    this._showDisabled = (ev.target as HaSwitch).checked;
  }

  private _openEditEntry(ev: CustomEvent): void {
    const entryId = (ev.detail as RowClickedEvent).id;
    const entry = this._entities!.find(
      (entity) => entity.entity_id === entryId
    );
    if (!entry) {
      return;
    }
    showEntityRegistryDetailDialog(this, {
      entry,
    });
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      ha-data-table {
        margin-bottom: 24px;
        margin-top: 0px;
        direction: ltr;
      }
    `;
  }
}

customElements.define("ha-config-entity-registry", HaConfigEntityRegistry);
