import { provide } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { mockIcons } from "../stubs/icons";
import { embedHassContext } from "./context";

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
   * Entities to add to the backend, as a JSON array in the attribute.
   * Each change adds or replaces the listed entities. Other entities stay.
   */
  @property({ type: Array }) public entities: EntityInput[] = [];

  constructor() {
    super();
    // Set up in the constructor so that the contexts exist before the
    // child cards connect and request them.
    const hass = provideHass(this);
    hass.updateTranslations(null);
    hass.updateTranslations("lovelace");
    mockIcons(hass);
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("entities")) {
      this.hass.addEntities(this.entities);
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    const oldHass = changedProps.get("hass");
    // The first update holds the initial entities. They are not changes.
    if (!oldHass) {
      return;
    }
    for (const [entityId, newState] of Object.entries(this.hass.states)) {
      const oldState = oldHass.states[entityId];
      if (oldState !== newState) {
        fireEvent(this, "state-changed", {
          entity_id: entityId,
          old_state: oldState,
          new_state: newState,
        });
      }
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
    "state-changed": {
      entity_id: string;
      old_state: HassEntity | undefined;
      new_state: HassEntity;
    };
  }
}
