import { provide } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { mockIcons } from "../stubs/icons";
import { embedHassContext } from "./context";
import { readScriptData } from "./script-data";

/**
 * Holds a mocked Home Assistant backend for all `ha-embed-card` elements
 * inside it. Cards in the same provider share their entities.
 */
@customElement("ha-embed-provider")
export class HaEmbedProvider extends LitElement {
  @provide({ context: embedHassContext })
  @property({ attribute: false })
  public hass!: MockHomeAssistant;

  /**
   * All entities of the backend. Each change replaces all entities.
   * Also read from a JSON or YAML script child, see `readScriptData`.
   */
  @property({ type: Array }) public entities: EntityInput[] = [];

  /** Light or dark mode of the cards. Without it, the browser setting. */
  @property({ attribute: "color-scheme" }) public colorScheme?:
    "light" | "dark";

  private _darkQuery = matchMedia("(prefers-color-scheme: dark)");

  private _applyColorScheme = () => {
    const dark = this.colorScheme
      ? this.colorScheme === "dark"
      : this._darkQuery.matches;
    if (this.hass.themes.darkMode !== dark) {
      this.hass.updateHass({
        themes: { ...this.hass.themes, darkMode: dark },
        selectedTheme: { ...this.hass.selectedTheme!, dark },
      });
    }
  };

  constructor() {
    super();
    // Set up in the constructor so that the contexts exist before the
    // child cards connect and request them.
    const hass = provideHass(this);
    hass.updateTranslations(null);
    hass.updateTranslations("lovelace");
    mockIcons(hass);
    this._applyColorScheme();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._darkQuery.addEventListener("change", this._applyColorScheme);
    const entities = readScriptData(this) as EntityInput[] | undefined;
    if (entities) {
      this.entities = entities;
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._darkQuery.removeEventListener("change", this._applyColorScheme);
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("colorScheme")) {
      this._applyColorScheme();
    }
    if (changedProps.has("entities")) {
      // Remove the old entities, so that services cannot bring them back.
      for (const entityId of Object.keys(this.hass.mockEntities)) {
        delete this.hass.mockEntities[entityId];
      }
      this.hass.updateHass({ entities: {} });
      this.hass.addEntities(this.entities, true);
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    const oldHass = changedProps.get("hass");
    // The first update holds the initial entities. They are not changes.
    if (!oldHass) {
      return;
    }
    // Other updates, such as loaded translations, keep the same states object.
    if (oldHass.states !== this.hass.states) {
      fireEvent(this, "states-changed", { states: this.hass.states });
    }
  }

  protected render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-provider": HaEmbedProvider;
  }
  interface HASSDomEvents {
    "states-changed": { states: HassEntities };
  }
}
