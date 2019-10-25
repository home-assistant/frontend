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
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";

class HaConfigEntityRegistry extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _entities?: EntityRegistryEntry[];
  @property() private _showDisabled = false;
  private _unsubEntities?: UnsubscribeFunc;

  private _columns = memoize(
    (_language): DataTableColumnContainer => {
      return {
        icon: {
          title: "",
          type: "icon",
          template: (icon) => html`
            <ha-icon slot="item-icon" .icon=${icon}></ha-icon>
          `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.entity_registry.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
        },
        entity_id: {
          title: this.hass.localize(
            "ui.panel.config.entity_registry.picker.headers.entity_id"
          ),
          sortable: true,
          filterable: true,
        },
        platform: {
          title: this.hass.localize(
            "ui.panel.config.entity_registry.picker.headers.integration"
          ),
          sortable: true,
          filterable: true,
          template: (platform) =>
            html`
              ${this.hass.localize(`component.${platform}.config.title`) ||
                platform}
            `,
        },
        disabled_by: {
          title: this.hass.localize(
            "ui.panel.config.entity_registry.picker.headers.enabled"
          ),
          type: "icon",
          template: (disabledBy) => html`
            <ha-icon
              slot="item-icon"
              .icon=${disabledBy ? "hass:cancel" : "hass:check-circle"}
            ></ha-icon>
          `,
        },
      };
    }
  );

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
        };
      })
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
      <div class="content">
        <div class="intro">
          <h2>
            ${this.hass.localize(
              "ui.panel.config.entity_registry.picker.header"
            )}
          </h2>
          <p>
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
            <ha-switch
              ?checked=${this._showDisabled}
              @change=${this._showDisabledChanged}
              >${this.hass.localize(
                "ui.panel.config.entity_registry.picker.show_disabled"
              )}
            </ha-switch>
          </div>
        </p>
        <ha-data-table
          .columns=${this._columns(this.hass.language)}
          .data=${this._filteredEntities(this._entities, this._showDisabled)}
          @row-click=${this._openEditEntry}
          id="entity_id"
        >
        </ha-data-table>
        </div>
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
      h2 {
        margin-top: 0;
        font-family: var(--paper-font-display1_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-display1_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-display1_-_font-size);
        font-weight: var(--paper-font-display1_-_font-weight);
        letter-spacing: var(--paper-font-display1_-_letter-spacing);
        line-height: var(--paper-font-display1_-_line-height);
        opacity: var(--dark-primary-opacity);
      }
      p {
        font-family: var(--paper-font-subhead_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-subhead_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-subhead_-_font-size);
        font-weight: var(--paper-font-subhead_-_font-weight);
        line-height: var(--paper-font-subhead_-_line-height);
        opacity: var(--dark-primary-opacity);
      }
      .intro {
        padding: 24px 16px 0;
      }
      .content {
        padding: 4px;
      }
      ha-data-table {
        margin-bottom: 24px;
        margin-top: 0px;
      }
      ha-switch {
        margin-top: 16px;
      }
    `;
  }
}

customElements.define("ha-config-entity-registry", HaConfigEntityRegistry);
