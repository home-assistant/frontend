import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import {
  ConfigEntry,
  subscribeConfigEntries,
} from "../../../data/config_entries";
import { domainToName } from "../../../data/integration";
import "../../../layouts/hass-loading-screen";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../types";

import "./ha-config-integration-page";
import "./ha-config-integrations-dashboard";

export interface ConfigEntryUpdatedEvent {
  entry: ConfigEntry;
}

export interface ConfigEntryRemovedEvent {
  entryId: string;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "entry-updated": ConfigEntryUpdatedEvent;
    "entry-removed": ConfigEntryRemovedEvent;
  }
}

export interface ConfigEntryExtended extends ConfigEntry {
  localized_domain_name?: string;
}

@customElement("ha-config-integrations")
class HaConfigIntegrations extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    routes: {
      dashboard: {
        tag: "ha-config-integrations-dashboard",
        cache: true,
      },
      integration: {
        tag: "ha-config-integration-page",
      },
    },
  };

  @state() private _configEntries?: ConfigEntryExtended[];

  private _unsubs?: UnsubscribeFunc[];

  public connectedCallback() {
    super.connectedCallback();

    if (!this.hass) {
      return;
    }
    this._subscribeData();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubs) {
      while (this._unsubs.length) {
        this._unsubs.pop()!();
      }
      this._unsubs = undefined;
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!this._unsubs && changedProps.has("hass")) {
      this._subscribeData();
    }
  }

  private async _subscribeData() {
    if (this._unsubs) {
      return;
    }
    this._unsubs = [
      await subscribeConfigEntries(
        this.hass,
        (messages) => {
          let fullUpdate = false;
          const newEntries: ConfigEntryExtended[] = [];
          messages.forEach((message) => {
            if (message.type === null || message.type === "added") {
              newEntries.push({
                ...message.entry,
                localized_domain_name: domainToName(
                  this.hass.localize,
                  message.entry.domain
                ),
              });
              if (message.type === null) {
                fullUpdate = true;
              }
            } else if (message.type === "removed") {
              this._configEntries = this._configEntries!.filter(
                (entry) => entry.entry_id !== message.entry.entry_id
              );
            } else if (message.type === "updated") {
              const newEntry = message.entry;
              this._configEntries = this._configEntries!.map((entry) =>
                entry.entry_id === newEntry.entry_id
                  ? {
                      ...newEntry,
                      localized_domain_name: entry.localized_domain_name,
                    }
                  : entry
              );
            }
          });
          if (!newEntries.length && !fullUpdate) {
            return;
          }
          console.log(this._configEntries);
          const existingEntries = fullUpdate ? [] : this._configEntries;
          this._configEntries = [...existingEntries!, ...newEntries];
        },
        { type: ["device", "hub", "service"] }
      ),
    ];
  }

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;

    if (this._currentPage === "integration") {
      pageEl.domain = this.routeTail.path.substr(1);
    }
    pageEl.route = this.routeTail;
    pageEl.configEntries = this._configEntries;
    pageEl.narrow = this.narrow;
    pageEl.isWide = this.isWide;
    pageEl.showAdvanced = this.showAdvanced;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-integrations": HaConfigIntegrations;
  }
}
