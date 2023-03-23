import { ContextProvider } from "@lit-labs/context";
import {
  areasContext,
  configContext,
  devicesContext,
  entitiesContext,
  localeContext,
  localizeContext,
  panelsContext,
  selectedThemeContext,
  statesContext,
  themesContext,
  userContext,
  userDataContext,
} from "../data/context";
import { Constructor, HomeAssistant } from "../types";
import { HassBaseEl } from "./hass-base-mixin";

export const contextMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private __contextProviders: Record<
      string,
      ContextProvider<any> | undefined
    > = {
      states: new ContextProvider(
        this,
        statesContext,
        this.hass ? this.hass.states : this._pendingHass.states
      ),
      entities: new ContextProvider(
        this,
        entitiesContext,
        this.hass ? this.hass.entities : this._pendingHass.entities
      ),
      devices: new ContextProvider(
        this,
        devicesContext,
        this.hass ? this.hass.devices : this._pendingHass.devices
      ),
      areas: new ContextProvider(
        this,
        areasContext,
        this.hass ? this.hass.areas : this._pendingHass.areas
      ),
      localize: new ContextProvider(
        this,
        localizeContext,
        this.hass ? this.hass.localize : this._pendingHass.localize
      ),
      locale: new ContextProvider(
        this,
        localeContext,
        this.hass ? this.hass.locale : this._pendingHass.locale
      ),
      config: new ContextProvider(
        this,
        configContext,
        this.hass ? this.hass.config : this._pendingHass.config
      ),
      themes: new ContextProvider(
        this,
        themesContext,
        this.hass ? this.hass.themes : this._pendingHass.themes
      ),
      selectedTheme: new ContextProvider(
        this,
        selectedThemeContext,
        this.hass ? this.hass.selectedTheme : this._pendingHass.selectedTheme
      ),
      user: new ContextProvider(
        this,
        userContext,
        this.hass ? this.hass.user : this._pendingHass.user
      ),
      userData: new ContextProvider(
        this,
        userDataContext,
        this.hass ? this.hass.userData : this._pendingHass.userData
      ),
      panels: new ContextProvider(
        this,
        panelsContext,
        this.hass ? this.hass.panels : this._pendingHass.panels
      ),
    };

    protected _updateHass(obj: Partial<HomeAssistant>) {
      super._updateHass(obj);
      for (const [key, value] of Object.entries(obj)) {
        if (key in this.__contextProviders) {
          this.__contextProviders[key]!.setValue(value);
        }
      }
    }
  };
