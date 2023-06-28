import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import {
  ConfigEntry,
  subscribeConfigEntries,
} from "../../../data/config_entries";
import {
  localizeConfigFlowTitle,
  subscribeConfigFlowInProgress,
} from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import { domainToName } from "../../../data/integration";
import "../../../layouts/hass-loading-screen";
import {
  HassRouterPage,
  RouterOptions,
} from "../../../layouts/hass-router-page";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";

import "./ha-config-integration-page";
import "./ha-config-integrations-dashboard";

export interface ConfigEntryUpdatedEvent {
  entry: ConfigEntry;
}

export interface ConfigEntryRemovedEvent {
  entryId: string;
}

export interface DataEntryFlowProgressExtended extends DataEntryFlowProgress {
  localized_title?: string;
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
class HaConfigIntegrations extends SubscribeMixin(HassRouterPage) {
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

  @property()
  private _configEntriesInProgress?: DataEntryFlowProgressExtended[];

  private _loadTranslationsPromise?: Promise<LocalizeFunc>;

  public hassSubscribe() {
    return [
      subscribeConfigEntries(
        this.hass,
        async (messages) => {
          await this._loadTranslationsPromise?.then(
            () =>
              // allow hass to update
              new Promise((resolve) => {
                window.setTimeout(resolve, 0);
              })
          );
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
          const existingEntries = fullUpdate ? [] : this._configEntries;
          this._configEntries = [...existingEntries!, ...newEntries];
        },
        { type: ["device", "hub", "service"] }
      ),
      subscribeConfigFlowInProgress(this.hass, async (flowsInProgress) => {
        const integrations: Set<string> = new Set();
        flowsInProgress.forEach((flow) => {
          // To render title placeholders
          if (flow.context.title_placeholders) {
            integrations.add(flow.handler);
          }
        });
        const localize = await this.hass.loadBackendTranslation(
          "config",
          Array.from(integrations)
        );
        this._configEntriesInProgress = flowsInProgress.map((flow) => ({
          ...flow,
          localized_title: localizeConfigFlowTitle(localize, flow),
        }));
      }),
    ];
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    if (this.hasUpdated) {
      return;
    }
    this._loadTranslationsPromise = this.hass.loadBackendTranslation("title");
  }

  protected updatePageEl(pageEl) {
    pageEl.hass = this.hass;

    if (this._currentPage === "integration") {
      if (this.routeTail.path) {
        pageEl.domain = this.routeTail.path.substring(1);
      } else if (window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("domain")) {
          const domain = urlParams.get("domain");
          pageEl.domain = domain;
          navigate(`/config/integrations/integration/${domain}`);
        }
      }
    }
    pageEl.route = this.routeTail;
    pageEl.configEntries = this._configEntries;
    pageEl.configEntriesInProgress = this._configEntriesInProgress;
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
