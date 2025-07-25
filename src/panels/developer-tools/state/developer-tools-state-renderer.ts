import {
  mdiClipboardTextMultipleOutline,
  mdiInformationOutline,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { dump } from "js-yaml";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { css, html, LitElement, nothing } from "lit";
import { classMap } from "lit/directives/class-map";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { loadVirtualizer } from "../../../resources/virtualizer";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-checkbox";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import { haStyle } from "../../../resources/styles";

@customElement("developer-tools-state-renderer")
class HaPanelDevStateRenderer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entities: HassEntity[] = [];

  @property({ type: Boolean, attribute: "narrow" })
  public narrow = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = true;

  @property({ type: Boolean, attribute: false })
  public showAttributes = true;

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (
      (!this.hasUpdated && this.virtualize) ||
      (changedProps.has("virtualize") && this.virtualize)
    ) {
      loadVirtualizer();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues<this>) {
    super.shouldUpdate(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const languageChanged =
      oldHass === undefined || oldHass.locale !== this.hass.locale;

    return (
      changedProps.has("entities") ||
      changedProps.has("narrow") ||
      changedProps.has("virtualize") ||
      changedProps.has("showAttributes") ||
      languageChanged
    );
  }

  protected render() {
    const showAttributes = !this.narrow && this.showAttributes;
    return html`
        <div class=${classMap({ entities: true, "hide-attributes": !showAttributes })}>
          <div class="row">
            <div class="header">
              <span class="padded">
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.entity"
                )}
              </span>
            </div>
            <div class = "header">
              <span class="padded">
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.state"
                )}
              </span>
            </div>
            <div class="header">
              <span class="padded">
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.attributes"
                )}
              </span>
            </div>
          </div>
          <div class="row filters">
            <div class="header filter-entities">
              <slot name="filter-entities"></slot>
            </div></span>
            <div class="header filter-states">
              <slot name="filter-states"></slot>
            </div>
            <div class="header filter-attributes">
              <slot name="filter-attributes"></slot>
            </div>
          </div>
          ${
            this.entities.length === 0
              ? html` <div class="row">
                  <div class="cell">
                    <span class="padded">
                      ${this.hass.localize(
                        "ui.panel.developer-tools.tabs.states.no_entities"
                      )}
                    </span>
                  </div>
                </div>`
              : nothing
          }
        ${
          this.virtualize
            ? html`<lit-virtualizer
                .items=${this.entities}
                .renderItem=${this._renderStateItem}
              >
              </lit-virtualizer>`
            : this.entities.map((item, index) =>
                this._renderStateItem(item, index)
              )
        }
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
    return html`
      <div
        class=${classMap({
          row: true,
          odd: index % 2 === 0,
          even: index % 2 !== 0,
        })}
      >
        <div class="cell">
          <span class="padded">
            <div class="id-name-container">
              <div class="id-name-row">
                <ha-svg-icon
                  @click=${this._copyEntity}
                  .entity=${item}
                  alt=${this.hass.localize(
                    "ui.panel.developer-tools.tabs.states.copy_id"
                  )}
                  title=${this.hass.localize(
                    "ui.panel.developer-tools.tabs.states.copy_id"
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
                  alt=${this.hass.localize(
                    "ui.panel.developer-tools.tabs.states.more_info"
                  )}
                  title=${this.hass.localize(
                    "ui.panel.developer-tools.tabs.states.more_info"
                  )}
                  .path=${mdiInformationOutline}
                ></ha-svg-icon>
                <span class="secondary">
                  ${item.attributes.friendly_name}
                </span>
              </div>
            </div>
          </span>
        </div>
        <div class="cell">
          <span class="padded">${item.state}</span>
        </div>
        <div class="cell">
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

  private _copyEntity = async (ev) => {
    ev.preventDefault();
    const entity = (ev.currentTarget! as any).entity;
    await copyToClipboard(entity.entity_id);
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  };

  private _entityMoreInfo(ev) {
    ev.preventDefault();
    const entity = (ev.currentTarget! as any).entity;
    fireEvent(this, "hass-more-info", { entityId: entity.entity_id });
  }

  private _entitySelected(ev) {
    ev.preventDefault();
    const entity = (ev.currentTarget! as any).entity;
    fireEvent(this, "states-tool-entity-selected", {
      entity: entity,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host([virtualize]) {
          display: block;
          height: 100%;
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
          padding: 4px;
        }

        .entities .row .header:nth-child(1),
        .entities .row .cell:nth-child(1) {
          min-width: 300px;
          width: 30%;
          flex: 2;
        }

        .entities .row .header:nth-child(3),
        .entities .row .cell:nth-child(3) {
          flex: 2;
        }

        .entities .row .cell:nth-child(3) {
          white-space: pre-wrap;
        }

        .hide-attributes .filter-attributes {
          display: none;
        }

        .hide-attributes .row .header:nth-child(3),
        .hide-attributes .row .cell:nth-child(3) {
          display: none;
        }

        .entities ha-svg-icon {
          --mdc-icon-size: 20px;
          padding: 4px;
          cursor: pointer;
          flex-shrink: 0;
          margin-right: 8px;
          margin-inline-end: 8px;
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
