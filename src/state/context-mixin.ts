import { ContextProvider } from "@lit/context";
import {
  ConfigEntryStream,
  type ConfigEntryUpdate,
} from "../data/config_entries";
import {
  areasContext,
  configContext,
  configEntriesContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  fullEntitiesContext,
  labelsContext,
  localeContext,
  localizeContext,
  panelsContext,
  selectedThemeContext,
  statesContext,
  themesContext,
  userContext,
  userDataContext,
} from "../data/context";
import { subscribeEntityRegistry } from "../data/entity/entity_registry";
import { subscribeLabelRegistry } from "../data/label/label_registry";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";
import { LazyContextProvider } from "./lazy-context-provider";

export const contextMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private __contextProviders: Record<
      string,
      ContextProvider<any> | undefined
    > = {
      connection: new ContextProvider(this, {
        context: connectionContext,
        initialValue: this.hass
          ? this.hass.connection
          : this._pendingHass.connection,
      }),
      states: new ContextProvider(this, {
        context: statesContext,
        initialValue: this.hass ? this.hass.states : this._pendingHass.states,
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
        context: configContext,
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
      floors: new ContextProvider(this, {
        context: floorsContext,
        initialValue: this.hass ? this.hass.floors : this._pendingHass.floors,
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
