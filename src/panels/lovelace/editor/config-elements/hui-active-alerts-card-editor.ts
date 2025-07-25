import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../types";
import "../../../../components/ha-textfield";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-icon";

@customElement("hui-active-alerts-card-editor")
export class HuiActiveAlertsCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: any;

  public setConfig(config: any) {
    this._config = {
      title: "",
      entities: [],
      ...config,
    };
  }

  private _addEntity(ev: CustomEvent) {
    if (!this._config) return;
    const value = ev.detail?.value;
    if (!value || this._config.entities.includes(value)) return;

    const newEntities = [...this._config.entities, value];
    this._config = { ...this._config, entities: newEntities };
    fireEvent(this, "config-changed", { config: this._config });

    // Clear the entity picker input
    const entityPicker = this.shadowRoot?.querySelector("ha-entity-picker");
    if (entityPicker) {
      (entityPicker as any).value = "";
      (entityPicker as any).updateComplete.then(() => {
        entityPicker.dispatchEvent(new Event("change"));
      });
    }
  }

  private _removeEntity(index: number) {
    if (!this._config) return;
    const newEntities = [...this._config.entities];
    newEntities.splice(index, 1);
    this._config = { ...this._config, entities: newEntities };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _titleChanged(ev: CustomEvent) {
    if (!this._config) return;
    const value = (ev.target as any).value;
    this._config = { ...this._config, title: value };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleRemoveEntity(e: Event) {
    const index = Number(
      (e.currentTarget as HTMLElement).getAttribute("data-index")
    );
    this._removeEntity(index);
  }

  render() {
    if (!this.hass || !this._config) return nothing;

    const entities = Array.isArray(this._config.entities)
      ? this._config.entities
      : [];

    return html`
      <div class="card-config">
        <ha-textfield
          .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.title"
          )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.optional"
          )})"
          .value=${this._config.title}
          @input=${this._titleChanged}
        ></ha-textfield>
        <ha-entity-picker
          .hass=${this.hass}
          .includeDomains=${["alert"]}
          .configValue=${"entities"}
          label="Add Entity"
          @value-changed=${this._addEntity}
        ></ha-entity-picker>
        <div class="entity-list">
          ${entities.length > 0
            ? entities.map(
                (entity: string, index: number) => html`
                  <div class="entity-row">
                    <span>${entity}</span>
                    <ha-icon
                      .icon=${"mdi:delete"}
                      data-index=${index}
                      @click=${this._handleRemoveEntity}
                      style="cursor: pointer;"
                    ></ha-icon>
                  </div>
                `
              )
            : html`<span>No entities selected</span>`}
        </div>
      </div>
    `;
  }

  static styles = css`
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }
    ha-textfield,
    ha-entity-picker {
      width: 100%;
    }
    .entity-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
    .entity-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: var(--secondary-background-color, #eee);
      border-radius: 4px;
    }
    .entity-row ha-icon {
      color: var(--error-color, #db4437);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-active-alerts-card-editor": HuiActiveAlertsCardEditor;
  }
}
