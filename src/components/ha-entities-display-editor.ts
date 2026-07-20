import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeEntityStates } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { computeStateName } from "../common/entity/compute_state_name";
import {
  configContext,
  connectionContext,
  entitiesContext,
} from "../data/context";
import { entityIcon } from "../data/icons";
import "./ha-items-display-editor";
import type { DisplayItem, DisplayValue } from "./ha-items-display-editor";

export interface EntitiesDisplayValue {
  hidden?: string[];
  order?: string[];
}

@customElement("ha-entities-display-editor")
export class HaEntitiesDisplayEditor extends LitElement {
  @state()
  @consumeEntityStates({ entityIdPath: ["entitiesIds"] })
  private _entityStates?: Record<string, HassEntity>;

  @consume({ context: entitiesContext, subscribe: true })
  @state()
  private _entitiesReg!: ContextType<typeof entitiesContext>;

  @consume({ context: configContext, subscribe: true })
  @state()
  private _config!: ContextType<typeof configContext>;

  @consume({ context: connectionContext, subscribe: true })
  @state()
  private _connection!: ContextType<typeof connectionContext>;

  @property() public label?: string;

  @property({ attribute: false }) public value?: EntitiesDisplayValue;

  @property({ attribute: false }) public entitiesIds: string[] = [];

  @property() public helper?: string;

  @property({ type: Boolean }) public expanded = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  protected render(): TemplateResult {
    const items = this._items(
      this.entitiesIds,
      this._entityStates,
      this._entitiesReg,
      this._config,
      this._connection
    );

    const value: DisplayValue = {
      order: this.value?.order ?? [],
      hidden: this.value?.hidden ?? [],
    };

    return html`
      <ha-items-display-editor
        .items=${items}
        .value=${value}
        @value-changed=${this._itemDisplayChanged}
      ></ha-items-display-editor>
    `;
  }

  private _items = memoizeOne(
    (
      entitiesIds: string[],
      entityStates: Record<string, HassEntity> | undefined,
      entitiesReg: ContextType<typeof entitiesContext>,
      config: ContextType<typeof configContext>,
      connection: ContextType<typeof connectionContext>
    ): DisplayItem[] => {
      const entities = entitiesIds
        .map((entityId) => entityStates?.[entityId])
        .filter((stateObj): stateObj is HassEntity => Boolean(stateObj));

      return entities.map((entity) => ({
        value: entity.entity_id,
        label: computeStateName(entity),
        icon: entityIcon(
          entitiesReg,
          config.config,
          connection.connection,
          entity
        ),
      }));
    }
  );

  private _itemDisplayChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value as DisplayValue;
    const newValue: EntitiesDisplayValue = {
      ...this.value,
      ...value,
    };
    if (newValue.hidden?.length === 0) {
      delete newValue.hidden;
    }
    if (newValue.order?.length === 0) {
      delete newValue.order;
    }
    fireEvent(this, "value-changed", { value: newValue });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entities-display-editor": HaEntitiesDisplayEditor;
  }
}
