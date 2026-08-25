import { consume, type ContextType } from "@lit/context";
import { mdiDelete, mdiDragHorizontalVariant } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { computeEntityPickerDisplay } from "../../../common/entity/compute_entity_name_display";
import {
  fireEvent,
  type HASSDomCurrentTargetEvent,
  type HASSDomEvent,
} from "../../../common/dom/fire_event";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import type {
  SecurityAlertEntityConfig,
  SecurityAlertSeverity,
} from "../../../data/frontend";
import {
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../data/context";
import "../../../components/entity/ha-entity-picker";
import "../../../components/entity/state-badge";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import { computeDefaultSecurityAlertSeverity } from "../strategies/security-alerts";
import { isSecurityPanelEntity } from "../strategies/security-view-strategy";
import type { ValueChangedEvent } from "../../../types";

type SecurityEditorContext = ContextType<typeof registriesContext> & {
  states: ContextType<typeof statesContext>;
  language: ContextType<typeof internationalizationContext>["language"];
  translationMetadata: ContextType<
    typeof internationalizationContext
  >["translationMetadata"];
};

@customElement("security-alerts-editor")
export class SecurityAlertsEditor extends LitElement {
  @property({ attribute: false })
  public alertEntities: SecurityAlertEntityConfig[] = [];

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  private _entityContext?: SecurityEditorContext;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      changedProps.has("_states") ||
      changedProps.has("_registries") ||
      changedProps.has("_i18n")
    ) {
      this._entityContext = {
        states: this._states,
        ...this._registries,
        language: this._i18n.language,
        translationMetadata: this._i18n.translationMetadata,
      };
    }
  }

  protected render() {
    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._moved}>
        <div class="alert-list">
          ${repeat(
            this.alertEntities,
            (alertEntity) => alertEntity.entity,
            (alertEntity, index) => this._renderAlertEntity(alertEntity, index)
          )}
        </div>
      </ha-sortable>
      <ha-entity-picker
        add-button
        .addButtonLabel=${this._i18n.localize(
          "ui.panel.security.editor.add_alert_entity"
        )}
        .excludeEntities=${this.alertEntities.map(({ entity }) => entity)}
        .entityFilter=${this._alertEntityFilter}
        @value-changed=${this._add}
      ></ha-entity-picker>
    `;
  }

  private _renderAlertEntity(
    alertEntity: SecurityAlertEntityConfig,
    index: number
  ) {
    const stateObj = this._states[alertEntity.entity];
    const { primary, secondary } =
      stateObj && this._entityContext
        ? computeEntityPickerDisplay(this._entityContext, stateObj)
        : { primary: alertEntity.entity, secondary: undefined };
    const severity =
      alertEntity.severity ?? computeDefaultSecurityAlertSeverity(stateObj);

    return html`
      <div class="alert-row">
        <div class="handle">
          <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
        </div>
        <ha-settings-row slim>
          <state-badge slot="prefix" .stateObj=${stateObj}></state-badge>
          <span slot="heading">${primary}</span>
          ${
            secondary
              ? html`<span slot="description">${secondary}</span>`
              : nothing
          }
          <ha-control-select-menu
            show-arrow
            hide-label
            .label=${this._i18n.localize(
              "ui.panel.security.editor.severity.label"
            )}
            .value=${severity}
            .options=${(["alert", "warning"] as const).map((option) => ({
              value: option,
              label: this._i18n.localize(
                `ui.panel.security.editor.severity.${option}`
              ),
            }))}
            data-index=${index}
            @wa-select=${this._severityChanged}
          ></ha-control-select-menu>
          <ha-icon-button
            .path=${mdiDelete}
            .label=${this._i18n.localize("ui.common.delete")}
            data-index=${index}
            @click=${this._removeClicked}
          ></ha-icon-button>
        </ha-settings-row>
      </div>
    `;
  }

  private _changed(next: SecurityAlertEntityConfig[]): void {
    fireEvent(this, "value-changed", { value: next });
  }

  private _alertEntityFilter = (entity: HassEntity) =>
    this._entityContext
      ? isSecurityPanelEntity(this._entityContext, entity)
      : false;

  private _getIndex(
    ev: HASSDomCurrentTargetEvent<HTMLElement>
  ): number | undefined {
    const index = Number(ev.currentTarget.dataset.index);
    return Number.isInteger(index) ? index : undefined;
  }

  private _removeClicked(ev: HASSDomCurrentTargetEvent<HTMLElement>): void {
    ev.stopPropagation();
    const index = this._getIndex(ev);
    if (index !== undefined) {
      const next = [...this.alertEntities];
      next.splice(index, 1);
      this._changed(next);
    }
  }

  private _severityChanged(
    ev: HaDropdownSelectEvent<SecurityAlertSeverity> &
      HASSDomCurrentTargetEvent<HTMLElement>
  ): void {
    ev.stopPropagation();
    const index = this._getIndex(ev);
    if (index === undefined) {
      return;
    }
    const next = [...this.alertEntities];
    next[index] = { ...next[index], severity: ev.detail.item.value };
    this._changed(next);
  }

  private _add(
    ev: ValueChangedEvent<string | undefined> &
      HASSDomCurrentTargetEvent<HaEntityPicker>
  ): void {
    ev.stopPropagation();
    const entity = ev.detail.value;
    if (!entity) return;

    ev.currentTarget.value = "";

    if (
      this.alertEntities.some((alertEntity) => alertEntity.entity === entity)
    ) {
      return;
    }

    this._changed([...this.alertEntities, { entity }]);
  }

  private _moved(ev: HASSDomEvent<HASSDomEvents["item-moved"]>): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this.alertEntities];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    this._changed(next);
  }

  static styles = css`
    :host {
      display: block;
    }
    .alert-list {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    .alert-row {
      display: flex;
      align-items: flex-start;
      gap: var(--ha-space-2);
    }
    .handle {
      cursor: grab;
      color: var(--secondary-text-color);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      min-height: 48px;
    }
    ha-settings-row {
      flex: 1;
      min-width: 0;
      padding: 0;
      gap: var(--ha-space-3);
      min-height: 48px;
      --settings-row-prefix-display: contents;
      --settings-row-content-display: contents;
      --settings-row-body-padding-top: var(--ha-space-1);
      --settings-row-body-padding-bottom: var(--ha-space-1);
    }
    state-badge {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      --state-icon-color: var(--secondary-text-color);
    }
    [slot="heading"],
    [slot="description"] {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ha-entity-picker {
      display: block;
      padding-top: var(--ha-space-3);
    }
    ha-icon-button {
      --ha-icon-button-size: 40px;
    }
    ha-control-select-menu {
      width: 118px;
      --control-select-menu-height: 42px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "security-alerts-editor": SecurityAlertsEditor;
  }
}
