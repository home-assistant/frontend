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
import { HomeAssistant } from "../../types";
import { PolymerChangedEvent } from "../../polymer-types";
import { fuzzySequentialMatch } from "../../common/string/sequence_matching";
import { componentsWithService } from "../../common/config/components_with_service";
import { domainIcon } from "../../common/entity/domain_icon";
import { computeDomain } from "../../common/entity/compute_domain";
import { domainToName } from "../../data/integration";

export interface QuickOpenDialogParams {
  entityFilter?: string;
  commandMode?: boolean;
}

interface QuickOpenItem {
  text: string;
  domain: string;
  icon?: string;
  onClick(ev: Event): void;
}

@customElement("ha-quick-open-dialog")
export class QuickOpenDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _items: QuickOpenItem[] = [];

  @internalProperty() private _entityFilter = "";

  @internalProperty() private _opened = false;

  @internalProperty() private _commandMode = false;

  public async showDialog(params: QuickOpenDialogParams) {
    this._commandMode = params.commandMode || false;
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    this._entityFilter = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _entityFilterChanged(ev: PolymerChangedEvent<string>) {
    this._entityFilter = ev.detail.value;
    if (this._entityFilter.startsWith(">")) {
      this._commandMode = true;
      this._entityFilter = this._entityFilter.substring(1);
    } else {
      this._commandMode = false;
    }

    let items: QuickOpenItem[];
    if (this._commandMode) {
      items = this._generateCommandItems(this._entityFilter);
    } else {
      items = this._generateEntityItems(this.hass, this._entityFilter);
    }
    this._items = this._filterItems(items, this._entityFilter);
  }

  private _generateCommandItems(_filter: string): QuickOpenItem[] {
    const reloadableDomains = componentsWithService(this.hass, "reload").sort();

    return reloadableDomains.map((domain) => ({
      text:
        this.hass.localize(`ui.dialogs.quick_open.commands.${domain}`) ||
        this.hass.localize(
          "ui.dialogs.quick_open.commands.reload",
          "domain",
          domainToName(this.hass.localize, domain)
        ),
      domain,
      onClick: this._executeCommand,
    }));
  }

  private _generateEntityItems(
    hass: HomeAssistant,
    _filter: string
  ): QuickOpenItem[] {
    return Object.keys(hass.states)
      .map((key) => hass.states[key])
      .map<QuickOpenItem>(({ entity_id }) => ({
        text: entity_id,
        domain: computeDomain(entity_id),
        onClick: this._entityMoreInfo,
      }));
  }

  private _filterItems(
    items: QuickOpenItem[],
    filter: string
  ): QuickOpenItem[] {
    return items
      .filter(({ text }) => fuzzySequentialMatch(filter.toLowerCase(), text))
      .sort((itemA, itemB) => {
        if (itemA.text < itemB.text) {
          return -1;
        }
        if (itemA.text > itemB.text) {
          return 1;
        }
        return 0;
      });
  }

  private async _executeCommand(ev: Event) {
    const eventData = {
      domain: (ev.target as any).domain,
      service: "reload",
    };

    await this.hass.callService(eventData.domain, "reload");

    fireEvent(this, "hass-service-called", eventData);

    this.closeDialog();
  }

  private _entityMoreInfo(ev: Event) {
    ev.preventDefault();
    fireEvent(this, "hass-more-info", {
      entityId: (ev.target as any).text,
    });
    this.closeDialog();
  }

  protected render() {
    if (!this._opened) {
      return html``;
    }

    return html`
      <ha-dialog open @closed=${this.closeDialog} hideActions>
        <paper-input
          dialogInitialFocus
          no-label-float
          @value-changed=${this._entityFilterChanged}
          .label=${this.hass.localize(
            "ui.dialogs.quick_open.filter_placeholder"
          )}
          type="search"
          value=${this._commandMode
            ? `>${this._entityFilter}`
            : this._entityFilter}
        ></paper-input>
        <mwc-list>
          ${this._items.map(
            ({ text, domain, onClick }) => html`
              <mwc-list-item
                @click=${onClick}
                .domain=${domain}
                .title=${this.hass.localize(
                  "ui.panel.developer-tools.tabs.states.more_info"
                )}
                graphic="icon"
              >
                <ha-icon .icon=${domainIcon(domain)} slot="graphic"></ha-icon>
                ${text}
              </mwc-list-item>
            `
          )}
        </mwc-list>
      </ha-dialog>
    `;
  }

  static get styles() {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-z-index: 8;
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

        ha-dialog[data-domain="camera"] {
          --dialog-content-padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-open-dialog": QuickOpenDialog;
  }
}
