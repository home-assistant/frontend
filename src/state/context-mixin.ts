import { ContextProvider } from "@lit/context";
import {
  ConfigEntryStream,
  type ConfigEntryUpdate,
} from "../data/config_entries";
import {
  apiContext,
  areasContext,
  authContext,
  configContext,
  configEntriesContext,
  configSingleContext,
  connectionContext,
  connectionSingleContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  fullEntitiesContext,
  internationalizationContext,
  labelsContext,
  localeContext,
  localizeContext,
  manifestsContext,
  panelsContext,
  registriesContext,
  selectedThemeContext,
  servicesContext,
  statesContext,
  themesContext,
  uiContext,
  userContext,
  userDataContext,
} from "../data/context";
import { updateHassGroups } from "../data/context/updateContext";
import { subscribeEntityRegistry } from "../data/entity/entity_registry";
import { fetchIntegrationManifestsCollection } from "../data/integration";
import { subscribeLabelRegistry } from "../data/label/label_registry";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";
import { LazyContextProvider } from "./lazy-context-provider";

export const contextMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private __hassContextProviderGroups: Record<string, ContextProvider<any>> =
      {
        registries: new ContextProvider(this, {
          context: registriesContext,
          initialValue: updateHassGroups.registries(
            this.hass || (this._pendingHass as HomeAssistant)
          ),
        }),
        internationalization: new ContextProvider(this, {
          context: internationalizationContext,
          initialValue: updateHassGroups.internationalization(
            this.hass || (this._pendingHass as HomeAssistant)
          ),
        }),
        api: new ContextProvider(this, {
          context: apiContext,
          initialValue: updateHassGroups.api(
            this.hass || (this._pendingHass as HomeAssistant)
          ),
        }),
        connection: new ContextProvider(this, {
          context: connectionContext,
          initialValue: updateHassGroups.connection(
            this.hass || (this._pendingHass as HomeAssistant)
          ),
        }),
        ui: new ContextProvider(this, {
          context: uiContext,
          initialValue: updateHassGroups.ui(
            this.hass || (this._pendingHass as HomeAssistant)
          ),
        }),
        config: new ContextProvider(this, {
          context: configContext,
          initialValue: updateHassGroups.config(
            this.hass || (this._pendingHass as HomeAssistant)
          ),
        }),
      };

    private __contextProviders: Record<
      string,
      ContextProvider<any> | undefined
    > = {
      states: new ContextProvider(this, {
        context: statesContext,
        initialValue: this.hass ? this.hass.states : this._pendingHass.states,
      }),
      services: new ContextProvider(this, {
        context: servicesContext,
        initialValue: this.hass
          ? this.hass.services
          : this._pendingHass.services,
      }),
      entities: new ContextProvider(this, {
        context: entitiesContext,
        initialValue: this.hass
          ? this.hass.entities
          : this._pendingHass.entities,
      }),
      devices: new ContextProvider(this, {
        context: devicesContext,
        initialValue: this.hass ? this.hass.devices : this._pendingHass.devices,
      }),
      areas: new ContextProvider(this, {
        context: areasContext,
        initialValue: this.hass ? this.hass.areas : this._pendingHass.areas,
      }),
      floors: new ContextProvider(this, {
        context: floorsContext,
        initialValue: this.hass ? this.hass.floors : this._pendingHass.floors,
      }),
      connection: new ContextProvider(this, {
        context: connectionSingleContext,
        initialValue: this.hass
          ? this.hass.connection
          : this._pendingHass.connection,
      }),
      localize: new ContextProvider(this, {
        context: localizeContext,
        initialValue: this.hass
          ? this.hass.localize
          : this._pendingHass.localize,
      }),
      locale: new ContextProvider(this, {
        context: localeContext,
        initialValue: this.hass ? this.hass.locale : this._pendingHass.locale,
      }),
      config: new ContextProvider(this, {
        context: configSingleContext,
        initialValue: this.hass ? this.hass.config : this._pendingHass.config,
      }),
      themes: new ContextProvider(this, {
        context: themesContext,
        initialValue: this.hass ? this.hass.themes : this._pendingHass.themes,
      }),
      selectedTheme: new ContextProvider(this, {
        context: selectedThemeContext,
        initialValue: this.hass
          ? this.hass.selectedTheme
          : this._pendingHass.selectedTheme,
      }),
      user: new ContextProvider(this, {
        context: userContext,
        initialValue: this.hass ? this.hass.user : this._pendingHass.user,
      }),
      userData: new ContextProvider(this, {
        context: userDataContext,
        initialValue: this.hass
          ? this.hass.userData
          : this._pendingHass.userData,
      }),
      panels: new ContextProvider(this, {
        context: panelsContext,
        initialValue: this.hass ? this.hass.panels : this._pendingHass.panels,
      }),
      auth: new ContextProvider(this, {
        context: authContext,
        initialValue: this.hass?.auth,
      }),
    };

    private __lazyContextProviders = {
      labels: new LazyContextProvider(this, {
        context: labelsContext,
        subscribeFn: (connection, setValue) =>
          subscribeLabelRegistry(connection, setValue),
      }),
      fullEntities: new LazyContextProvider(this, {
        context: fullEntitiesContext,
        subscribeFn: (connection, setValue) =>
          subscribeEntityRegistry(connection, setValue),
      }),
      configEntries: new LazyContextProvider(this, {
        context: configEntriesContext,
        subscribeFn: (connection, setValue) => {
          const stream = new ConfigEntryStream();
          return connection.subscribeMessage<ConfigEntryUpdate[]>(
            (messages) => {
              setValue(stream.processMessage(messages));
            },
            { type: "config_entries/subscribe" }
          );
        },
      }),
      manifests: new LazyContextProvider(this, {
        context: manifestsContext,
        subscribeFn: fetchIntegrationManifestsCollection,
      }),
    };

    protected hassConnected() {
      super.hassConnected();
      for (const [key, value] of Object.entries(this.hass!)) {
        if (key in this.__contextProviders) {
          this.__contextProviders[key]!.setValue(value);
        }
      }

      // Provide connection to lazy providers so they can subscribe on demand
      const connection = this.hass!.connection!;
      for (const provider of Object.values(this.__lazyContextProviders)) {
        provider.setConnection(connection);
      }
    }

    protected _updateHass(obj: Partial<HomeAssistant>) {
      super._updateHass(obj);

      for (const groupProvider of Object.keys(
        this.__hassContextProviderGroups
      )) {
        if (groupProvider in updateHassGroups) {
          this.__hassContextProviderGroups[groupProvider]!.setValue(
            updateHassGroups[groupProvider]!(
              this.hass!,
              this.__hassContextProviderGroups[groupProvider]!.value
            )
          );
        }
      }

      for (const [key, value] of Object.entries(obj)) {
        if (key in this.__contextProviders) {
          this.__contextProviders[key]!.setValue(value);
        }
      }
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      for (const provider of Object.values(this.__lazyContextProviders)) {
        provider.unsubscribe();
      }
    }
  };
