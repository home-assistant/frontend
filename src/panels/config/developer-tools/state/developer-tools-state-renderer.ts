import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import {
  mdiClipboardTextMultipleOutline,
  mdiInformationOutline,
} from "@mdi/js";
import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { dump } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityEntryName } from "../../../../common/entity/compute_entity_name";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-svg-icon";
import {
  areasContext,
  devicesContext,
  entitiesContext,
  internationalizationContext,
} from "../../../../data/context";
import { haStyle } from "../../../../resources/styles";
import { loadVirtualizer } from "../../../../resources/virtualizer";
import { showToast } from "../../../../util/toast";

@customElement("developer-tools-state-renderer")
class HaPanelDevStateRenderer extends LitElement {
  @property({ attribute: false }) public entities: HassEntity[] = [];

  @property({ type: Boolean, attribute: "narrow" })
  public narrow = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = true;

  @property({ attribute: false })
  public showAttributes = true;

  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @consume({ context: areasContext, subscribe: true })
  private _areas!: ContextType<typeof areasContext>;

  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      (!this.hasUpdated && this.virtualize) ||
      (changedProps.has("virtualize") && this.virtualize)
    ) {
      loadVirtualizer();
    }
  }

  protected render() {
    const showAttributes = !this.narrow && this.showAttributes;
    return html`
      <div
        class=${classMap({
          entities: true,
          "hide-attributes": !showAttributes,
          "hide-extra": this.narrow,
        })}
        role="table"
      >
        <div class="row" role="row" aria-rowindex="1">
          <div class="header" role="columnheader">
            <span class="padded">
              ${this._i18n.localize(
                "ui.panel.config.developer-tools.tabs.states.entity"
              )}
            </span>
          </div>
          <div class="header" role="columnheader">
            <span class="padded">
              ${this._i18n.localize(
                "ui.panel.config.developer-tools.tabs.states.state"
              )}
            </span>
          </div>
          <div class="header" role="columnheader">
            <span class="padded">
              ${this._i18n.localize(
                "ui.panel.config.entities.picker.headers.device"
              )}
            </span>
          </div>
          <div class="header" role="columnheader">
            <span class="padded">
              ${this._i18n.localize("ui.panel.config.generic.headers.area")}
            </span>
          </div>
          <div class="header" role="columnheader">
            <span class="padded">
              ${this._i18n.localize(
                "ui.panel.config.developer-tools.tabs.states.attributes"
              )}
            </span>
          </div>
        </div>
        <div class="row filters" role="row" aria-rowindex="2">
          <div class="header filter-entities" role="columnheader">
            <slot name="filter-entities"></slot>
          </div>
          <div class="header filter-states" role="columnheader">
            <slot name="filter-states"></slot>
          </div>
          <div class="header filter-devices" role="columnheader">
            <slot name="filter-devices"></slot>
          </div>
          <div class="header filter-areas" role="columnheader">
            <slot name="filter-areas"></slot>
          </div>
          <div class="header filter-attributes" role="columnheader">
            <slot name="filter-attributes"></slot>
          </div>
        </div>
        ${this.entities.length === 0
          ? html` <div class="row" role="row" aria-rowindex="3">
              <div class="cell" role="cell" aria-colspan="5">
                <span class="padded">
                  ${this._i18n.localize(
                    "ui.panel.config.developer-tools.tabs.states.no_entities"
                  )}
                </span>
              </div>
            </div>`
          : nothing}
        ${this.virtualize
          ? html`<lit-virtualizer
              .items=${this.entities}
              .renderItem=${this._renderStateItem}
            >
            </lit-virtualizer>`
          : this.entities.map((item, index) =>
              this._renderStateItem(item, index)
            )}
      </div>
    `;
  }

  private _renderStateItem: RenderItemFunction<HassEntity> = (
    item: HassEntity,
    index: number
  ): TemplateResult | any => {
    if (!item || index === undefined) {
      return nothing;
    }

    const entry = this._entities?.[item.entity_id];
    const device = entry?.device_id
      ? this._devices?.[entry.device_id]
      : undefined;
    const areaId = entry?.area_id || device?.area_id;
    const area = areaId ? this._areas?.[areaId] : undefined;

    const displayName = entry
      ? computeEntityEntryName(entry, this._devices, item)
      : undefined;
    const deviceName = device ? computeDeviceName(device) : undefined;
    const areaName = area ? computeAreaName(area) : undefined;

    return html`
      <div
        class=${classMap({
          row: true,
          odd: index % 2 === 0,
          even: index % 2 !== 0,
        })}
        role="row"
        aria-rowindex=${index + 3}
      >
        <div class="cell" role="cell">
          <span class="padded">
            <div class="id-name-container">
              <div class="id-name-row">
                <ha-svg-icon
                  @click=${this._copyEntity}
                  .entity=${item}
                  alt=${this._i18n.localize(
                    "ui.panel.config.developer-tools.tabs.states.copy_id"
                  )}
                  title=${this._i18n.localize(
                    "ui.panel.config.developer-tools.tabs.states.copy_id"
                  )}
                  .path=${mdiClipboardTextMultipleOutline}
                ></ha-svg-icon>
                <a href="#" .entity=${item} @click=${this._entitySelected}
                  >${item.entity_id}</a
                >
              </div>
              <div class="id-name-row">
                <ha-svg-icon
                  @click=${this._entityMoreInfo}
                  .entity=${item}
                  alt=${this._i18n.localize(
                    "ui.panel.config.developer-tools.tabs.states.more_info"
                  )}
                  title=${this._i18n.localize(
                    "ui.panel.config.developer-tools.tabs.states.more_info"
                  )}
                  .path=${mdiInformationOutline}
                ></ha-svg-icon>
                <span class="secondary">
                  ${displayName ?? deviceName ?? item.attributes.friendly_name}
                </span>
              </div>
            </div>
          </span>
        </div>
        <div class="cell" role="cell">
          <span class="padded">${item.state}</span>
        </div>
        <div class="cell" role="cell">
          <span class="padded">${deviceName ?? "\u2014"}</span>
        </div>
        <div class="cell" role="cell">
          <span class="padded">${areaName ?? "\u2014"}</span>
        </div>
        <div class="cell" role="cell">
          <span class="padded">${this._attributeString(item)}</span>
        </div>
      </div>
    `;
  };

  private _formatAttributeValue(value) {
    if (
      (Array.isArray(value) && value.some((val) => val instanceof Object)) ||
      (!Array.isArray(value) && value instanceof Object)
    ) {
      return `\n${dump(value)}`;
    }
    return Array.isArray(value) ? value.join(", ") : value;
  }

  private _attributeString(entity) {
    const output = "";

    if (entity && entity.attributes) {
      return Object.keys(entity.attributes).map(
        (key) =>
          `${key}: ${this._formatAttributeValue(entity.attributes[key])}\n`
      );
    }

    return output;
  }

  private _copyEntity = async (ev: Event) => {
    ev.preventDefault();
    const entity = (ev.currentTarget as HTMLElement & { entity: HassEntity })
      .entity;
    await copyToClipboard(entity.entity_id, document.body);
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
    });
  };

  private _entityMoreInfo(ev: Event) {
    ev.preventDefault();
    const entity = (ev.currentTarget as HTMLElement & { entity: HassEntity })
      .entity;
    fireEvent(this, "hass-more-info", { entityId: entity.entity_id });
  }

  private _entitySelected(ev: Event) {
    ev.preventDefault();
    const entity = (ev.currentTarget as HTMLElement & { entity: HassEntity })
      .entity;
    fireEvent(this, "states-tool-entity-selected", {
      entity,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host([virtualize]) {
          display: block;
          height: 100%;
          overflow: auto;
        }

        .entities {
          width: 100%;
        }

        .entities .row {
          display: flex;
          width: 100%;
        }

        .entities .odd .cell {
          background-color: var(--table-row-background-color, #fff);
        }

        .entities .even .cell {
          background-color: var(--table-row-alternative-background-color, #eee);
        }

        .header,
        .cell {
          min-width: 200px;
          flex: 1;
          display: flex;
          margin: 0 1px 0 1px;
        }

        .header {
          font-weight: bold;
          text-align: var(--float-start);
          direction: var(--direction);
        }

        .header .padded {
          padding: 0 8px;
        }

        .filters .header {
          background-color: var(--table-row-alternative-background-color, #eee);
          --mdc-text-field-fill-color: var(
            --table-row-alternative-background-color,
            #eee
          );
        }

        .cell {
          word-break: break-word;
          vertical-align: top;
          direction: ltr;
        }

        .cell .padded {
          padding: var(--ha-space-1);
        }

        .entities .row .header:nth-child(1),
        .entities .row .cell:nth-child(1) {
          min-width: 300px;
          width: 30%;
          flex: 2;
        }

        .entities .row .header:nth-child(5),
        .entities .row .cell:nth-child(5) {
          flex: 2;
        }

        .entities .row .cell:nth-child(5) {
          white-space: pre-wrap;
        }

        .hide-attributes .filter-attributes {
          display: none;
        }

        .hide-attributes .row .header:nth-child(5),
        .hide-attributes .row .cell:nth-child(5) {
          display: none;
        }

        .hide-extra .row .header:nth-child(3),
        .hide-extra .row .cell:nth-child(3),
        .hide-extra .row .header:nth-child(4),
        .hide-extra .row .cell:nth-child(4) {
          display: none;
        }

        .hide-extra .filter-devices,
        .hide-extra .filter-areas {
          display: none;
        }

        .entities ha-svg-icon {
          --mdc-icon-size: 20px;
          padding: var(--ha-space-1);
          cursor: pointer;
          flex-shrink: 0;
          margin-right: var(--ha-space-2);
          margin-inline-end: var(--ha-space-2);
          margin-inline-start: initial;
        }

        .entities a {
          color: var(--primary-color);
        }

        .entities .id-name-container {
          display: flex;
          flex-direction: column;
        }

        .entities .id-name-row {
          display: flex;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-state-renderer": HaPanelDevStateRenderer;
  }

  interface HASSDomEvents {
    "states-tool-entity-selected": {
      entity: Partial<HassEntity>;
    };
  }
}
