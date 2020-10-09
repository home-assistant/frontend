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
import memoizeOne from "memoize-one";
import { SingleSelectedEvent } from "@material/mwc-list/mwc-list-foundation";

interface CommandItem extends ServiceCallRequest {
  text: string;
}

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _commandItems: CommandItem[] = [];

  @internalProperty() private _itemFilter = "";

  @internalProperty() private _opened = false;

  @internalProperty() private _commandMode = false;

  @internalProperty() private _topEntityIdResult?: string;

  @internalProperty() private _topCommandResult?: CommandItem;

  public async showDialog(params: QuickBarParams) {
    this._commandMode = params.commandMode || false;
    this._opened = true;
    this._commandItems = this._generateCommandItems();
  }

  public closeDialog() {
    this._opened = false;
    this._itemFilter = "";
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
          @keydown=${this._activateFirstItem}
        ></paper-input>
        ${this._commandMode
          ? this.renderCommandsList(this._itemFilter)
          : this.renderEntityList(this._itemFilter)}
      </ha-dialog>
    `;
  }

  protected renderCommandsList = memoizeOne((filter) => {
    const items = this._filterCommandItems(this._commandItems, filter);

    this._topCommandResult = items[0];

    return html`
      <mwc-list @selected=${this._processCommand}>
        ${items.map(
          (item) => html`
            <mwc-list-item .item=${item} graphic="icon">
              <ha-icon
                .icon=${domainIcon(item.domain)}
                slot="graphic"
              ></ha-icon>
              ${item.text}
            </mwc-list-item>
          `
        )}
      </mwc-list>
    `;
  });

  protected renderEntityList = memoizeOne((filter) => {
    const entities = this._filterEntityItems(
      Object.keys(this.hass.states),
      filter
    );

    this._topEntityIdResult = entities[0];

    return html`
      <mwc-list activatable @selected=${this._entityMoreInfo}>
        ${entities.map((entityId, index) => {
          const domain = computeDomain(entityId);
          return html`
            <mwc-list-item
              graphic="icon"
              .entityId=${entityId}
              .activated=${index === 0}
            >
              <ha-icon .icon=${domainIcon(domain)} slot="graphic"></ha-icon>
              ${entityId}
            </mwc-list-item>
          `;
        })}
      </mwc-list>
    `;
  });

  private _activateFirstItem(ev: KeyboardEvent) {
    if (ev.code === "Enter") {
      if (this._commandMode) {
        this._runCommandAndCloseDialog(this._topCommandResult);
      } else {
        this._launchMoreInfoDialog(this._topEntityIdResult);
      }
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
        fuzzySequentialMatch(filter.toLowerCase(), text.toLowerCase())
      )
      .sort((itemA, itemB) => compare(itemA.text, itemB.text));
  }

  private _filterEntityItems(
    entityIds: HassEntity["entity_id"][],
    filter: string
  ): HassEntity["entity_id"][] {
    return entityIds
      .filter((entityId) =>
        fuzzySequentialMatch(filter.toLowerCase(), entityId)
      )
      .sort();
  }

  private async _processCommand(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    const item = (ev.target as any).items[index].item;

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

    await this.hass.callService(
      request.domain,
      request.service,
      request.serviceData
    );

    this.closeDialog();
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
