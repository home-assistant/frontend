import "../../components/ha-circular-progress";
import "../../components/ha-header-bar";
import "@polymer/paper-input/paper-input";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-list";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant, ServiceCallRequest } from "../../types";
import { PolymerChangedEvent } from "../../polymer-types";
import { fuzzySequentialMatch } from "../../common/string/sequence_matching";
import { componentsWithService } from "../../common/config/components_with_service";
import { domainIcon } from "../../common/entity/domain_icon";
import { computeDomain } from "../../common/entity/compute_domain";
import { domainToName } from "../../data/integration";
import { QuickBarParams } from "./show-dialog-quick-bar";
import { HassEntity } from "home-assistant-js-websocket";
import { compare } from "../../common/string/compare";
import { SingleSelectedEvent } from "@material/mwc-list/mwc-list-foundation";

interface CommandItem extends ServiceCallRequest {
  text: string;
}

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _commandItems: CommandItem[] = [];

  @internalProperty() private _entities: HassEntity[] = [];

  @internalProperty() private _itemFilter = "";

  @internalProperty() private _opened = false;

  @internalProperty() private _commandMode = false;

  @internalProperty() private _commandTriggered = -1;

  @internalProperty() private _activatedIndex = 0;

  @query("paper-input", false) private _filterInputField?: HTMLElement;

  @query("mwc-list-item", false) private _firstListItem?: HTMLElement;

  public async showDialog(params: QuickBarParams) {
    this._commandMode = params.commandMode || false;
    this._opened = true;
    this._commandItems = this._generateCommandItems();
    this._entities = Object.keys(this.hass.states).map<HassEntity>(
      (entity_id) => this.hass.states[entity_id]
    );
  }

  public closeDialog() {
    this._opened = false;
    this._itemFilter = "";
    this._commandTriggered = -1;
    this._resetActivatedIndex();
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return html``;
    }

    return html`
      <ha-dialog .heading=${true} open @closed=${this.closeDialog} hideActions>
        <paper-input
          dialogInitialFocus
          no-label-float
          slot="heading"
          class="heading"
          @value-changed=${this._entityFilterChanged}
          .label=${this.hass.localize(
            "ui.dialogs.quick-bar.filter_placeholder"
          )}
          type="search"
          value=${this._commandMode ? `>${this._itemFilter}` : this._itemFilter}
          @keydown=${this._handleInputKeyDown}
          @focus=${this._resetActivatedIndex}
        ></paper-input>
        ${this._commandMode
          ? this.renderCommandsList()
          : this.renderEntityList()}
      </ha-dialog>
    `;
  }

  protected renderCommandsList() {
    const items = this._filterCommandItems(
      this._commandItems,
      this._itemFilter
    );

    return html`
      <mwc-list activatable @selected=${this._processCommand}>
        ${items.map(
          (item, index) => html`
            <mwc-list-item
              .activated=${index === this._activatedIndex}
              .item=${item}
              .index=${index}
              @keydown=${this._handleListItemKeyDown}
              hasMeta
              graphic="icon"
            >
              <ha-icon
                .icon=${domainIcon(item.domain)}
                slot="graphic"
              ></ha-icon>
              ${item.text}
              ${this._commandTriggered === index
                ? html`<ha-circular-progress
                    size="small"
                    active
                    slot="meta"
                  ></ha-circular-progress>`
                : null}
            </mwc-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  protected renderEntityList() {
    const entities = this._filterEntityItems(this._itemFilter);

    return html`
      <mwc-list activatable @selected=${this._entityMoreInfo}>
        ${entities.map((entity, index) => {
          const domain = computeDomain(entity.entity_id);
          return html`
            <mwc-list-item
              twoline
              .entityId=${entity.entity_id}
              graphic="avatar"
              .activated=${index === this._activatedIndex}
              .index=${index}
              @keydown=${this._handleListItemKeyDown}
            >
              <ha-icon .icon=${domainIcon(domain)} slot="graphic"></ha-icon>
              ${entity.attributes?.friendly_name
                ? html`
                    <span>
                      ${entity.attributes?.friendly_name}
                    </span>
                    <span slot="secondary">${entity.entity_id}</span>
                  `
                : html`
                    <span>
                      ${entity.entity_id}
                    </span>
                  `}
            </mwc-list-item>
          `;
        })}
      </mwc-list>
    `;
  }

  private _resetActivatedIndex() {
    this._activatedIndex = 0;
  }

  private _handleInputKeyDown(ev: KeyboardEvent) {
    if (ev.code === "Enter") {
      this._firstListItem?.click();
    } else if (ev.code === "ArrowDown") {
      ev.preventDefault();
      this._firstListItem?.focus();
    }
  }

  private _handleListItemKeyDown(ev: KeyboardEvent) {
    const isSingleCharacter = ev.key.length === 1;
    const isFirstListItem = (ev.target as any).index === 0;
    if (ev.key === "ArrowUp") {
      if (isFirstListItem) {
        this._filterInputField?.focus();
      } else {
        this._activatedIndex--;
      }
    } else if (ev.key === "ArrowDown") {
      this._activatedIndex++;
    }

    if (ev.key === "Backspace" || isSingleCharacter) {
      this._filterInputField?.focus();
      this._resetActivatedIndex();
    }
  }

  private _entityFilterChanged(ev: PolymerChangedEvent<string>) {
    const newFilter = ev.detail.value;

    if (newFilter.startsWith(">")) {
      this._commandMode = true;
      this._itemFilter = newFilter.substring(1);
    } else {
      this._commandMode = false;
      this._itemFilter = newFilter;
    }
  }

  private _generateCommandItems(): CommandItem[] {
    const reloadableDomains = componentsWithService(this.hass, "reload").sort();

    return reloadableDomains.map((domain) => ({
      text:
        this.hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
        this.hass.localize(
          "ui.dialogs.quick-bar.commands.reload.reload",
          "domain",
          domainToName(this.hass.localize, domain)
        ),
      domain,
      service: "reload",
    }));
  }

  private _filterCommandItems(
    items: CommandItem[],
    filter: string
  ): CommandItem[] {
    return items
      .filter(({ text }) =>
        fuzzySequentialMatch(filter.toLowerCase(), [text.toLowerCase()])
      )
      .sort((itemA, itemB) => compare(itemA.text, itemB.text));
  }

  private _filterEntityItems(filter: string): HassEntity[] {
    return this._entities
      .filter(({ entity_id, attributes: { friendly_name } }) => {
        const values = [entity_id];
        if (friendly_name) {
          values.push(friendly_name);
        }
        return fuzzySequentialMatch(filter.toLowerCase(), values);
      })
      .sort((entityA, entityB) =>
        compare(entityA.entity_id, entityB.entity_id)
      );
  }

  private async _processCommand(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    const item = (ev.target as any).items[index].item;

    this._commandTriggered = index;

    this._runCommandAndCloseDialog({
      domain: item.domain,
      service: item.service,
      serviceData: item.serviceData,
    });
  }

  private async _runCommandAndCloseDialog(request?: ServiceCallRequest) {
    if (!request) {
      return;
    }

    this.hass
      .callService(request.domain, request.service, request.serviceData)
      .then(() => this.closeDialog());
  }

  private _entityMoreInfo(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    const entityId = (ev.target as any).items[index].entityId;

    this._launchMoreInfoDialog(entityId);
  }

  private _launchMoreInfoDialog(entityId) {
    fireEvent(this, "hass-more-info", { entityId });
    this.closeDialog();
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        .heading {
          padding: 20px 20px 0px;
        }

        ha-dialog {
          --dialog-z-index: 8;
          --dialog-content-padding: 0px 24px 20px;
        }

        @media (min-width: 800px) {
          ha-dialog {
            --mdc-dialog-max-width: 800px;
            --mdc-dialog-min-width: 500px;
            --dialog-surface-position: fixed;
            --dialog-surface-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-bar": QuickBar;
  }
}
