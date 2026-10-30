import type { ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { arrayWith, arrayWithout } from "../../../common/array/array-with";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import {
  computeEntityPickerDisplay,
  computeEntitySearchLabels,
} from "../../../common/entity/compute_entity_name_display";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-state-icon";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import "../../../components/item/ha-list-item-option";
import "../../../components/list/ha-list-selectable-virtualized";
import type { HaListVirtualizedItem } from "../../../components/list/ha-list-virtualized";
import {
  configContext,
  internationalizationContext,
  registriesContext,
  statesContext,
} from "../../../data/context";
import type { ExposeEntitySettings } from "../../../data/expose";
import { voiceAssistants } from "../../../data/expose";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyle } from "../../../resources/styles";
import type { ExposeEntityDialogParams } from "./show-dialog-expose-entity";

interface ExposeEntityRow extends HaListVirtualizedItem {
  stateObj: HassEntity;
}

@customElement("dialog-expose-entity")
class DialogExposeEntity extends DirtyStateProviderMixin<string[]>()(
  DialogMixin<ExposeEntityDialogParams>(LitElement)
) {
  @state() private _filter?: string;

  @state() private _selected: string[] = [];

  @state() private _dialogReady = false;

  public connectedCallback(): void {
    super.connectedCallback();
    this._initDirtyTracking({ type: "deep" }, this._selected);
  }

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  protected _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  protected _config!: ContextType<typeof configContext>;

  @consume({ context: statesContext, subscribe: true })
  protected _states!: ContextType<typeof statesContext>;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  protected _registries!: ContextType<typeof registriesContext>;

  protected render() {
    if (!this.params) {
      return nothing;
    }

    const header = this._i18n.localize(
      "ui.panel.config.voice_assistants.expose.expose_dialog.header"
    );
    const subtitle = this._i18n.localize(
      "ui.panel.config.voice_assistants.expose.expose_dialog.expose_to",
      {
        assistants: this.params.filterAssistants
          .map((ass) => voiceAssistants[ass].name)
          .join(", "),
      }
    );

    const entities = this._filterEntities(
      this.params.exposedEntities,
      this._registries,
      this._filter
    );

    return html`
      <ha-dialog
        open
        header-title=${header}
        header-subtitle=${subtitle}
        .preventScrimClose=${this.isDirtyState}
        @after-show=${this._dialogShown}
      >
        <ha-input-search
          appearance="outlined"
          .value=${this._filter}
          @input=${this._filterChanged}
        ></ha-input-search>
        ${
          this._dialogReady
            ? html`<ha-list-selectable-virtualized
                multi
                aria-label=${header}
                .rows=${entities}
                .rowRenderer=${this._renderItem}
                @ha-list-item-selected=${this._handleItemToggled}
                @ha-list-item-deselected=${this._handleItemToggled}
              ></ha-list-selectable-virtualized>`
            : nothing
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._expose}
            .disabled=${this._selected.length === 0}
          >
            ${this._i18n.localize(
              "ui.panel.config.voice_assistants.expose.expose_dialog.expose_entities",
              { count: this._selected.length }
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _dialogShown() {
    this._dialogReady = true;
  }

  private _handleItemToggled(ev: CustomEvent<number>) {
    const entityId = this._filterEntities(
      this.params!.exposedEntities,
      this._registries,
      this._filter
    )[ev.detail]?.id;
    if (!entityId) {
      return;
    }

    this._selected =
      ev.type === "ha-list-item-selected"
        ? arrayWith(this._selected, entityId)
        : arrayWithout(this._selected, entityId);
    this._updateDirtyState(this._selected);
  }

  private _filterChanged(e: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = e.target.value;
  }

  private _filterEntities = memoizeOne(
    (
      exposedEntities: Record<string, ExposeEntitySettings>,
      registries: ContextType<typeof registriesContext>,
      filter?: string
    ): ExposeEntityRow[] => {
      const lowerFilter = filter?.toLowerCase();
      const result: ExposeEntityRow[] = [];

      for (const entity of Object.values(this._states)) {
        if (
          this.params!.filterAssistants.every(
            (ass) => exposedEntities[entity.entity_id]?.[ass]
          )
        ) {
          continue;
        }

        if (
          !lowerFilter ||
          entity.entity_id.toLowerCase().includes(lowerFilter)
        ) {
          result.push({
            id: entity.entity_id,
            interactive: true,
            stateObj: entity,
          });
          continue;
        }

        const { friendlyName, deviceName, parentDeviceName, areaName } =
          computeEntitySearchLabels(entity, registries);

        if (
          [friendlyName, deviceName, parentDeviceName, areaName].some((name) =>
            name?.toLowerCase().includes(lowerFilter)
          )
        ) {
          result.push({
            id: entity.entity_id,
            interactive: true,
            stateObj: entity,
          });
        }
      }

      return result;
    }
  );

  private _renderItem = (row: ExposeEntityRow) => {
    const entityState = row.stateObj;
    const { primary, secondary: context } = computeEntityPickerDisplay(
      {
        entities: this._registries.entities,
        devices: this._registries.devices,
        areas: this._registries.areas,
        floors: this._registries.floors,
        language: this._i18n.language,
        translationMetadata: this._i18n.translationMetadata,
      },
      entityState
    );
    const showEntityId = this._config?.userData?.showEntityIdPicker;

    return html`
      <ha-list-item-option
        appearance="checkbox"
        selection-position="end"
        .value=${row.id}
        .selected=${this._selected.includes(row.id)}
      >
        <ha-state-icon
          title=${ifDefined(entityState.state)}
          slot="start"
          .stateObj=${entityState}
        ></ha-state-icon>
        <span slot="headline">${primary}</span>
        ${
          context || showEntityId
            ? html`<span slot="supporting-text">
                ${context}
                ${
                  showEntityId
                    ? html`${context ? html`<br />` : nothing}${row.id}`
                    : nothing
                }
              </span>`
            : nothing
        }
      </ha-list-item-option>
    `;
  };

  private _expose() {
    this.params!.exposeEntities(this._selected);
    this._markDirtyStateClean();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        ha-input-search {
          padding: 0 var(--ha-space-3);
        }
        ha-list-selectable-virtualized {
          height: 500px;
        }
        @media all and (max-height: 800px) {
          ha-list-selectable-virtualized {
            height: 334px;
          }
        }
        @media all and (max-height: 600px) {
          ha-list-selectable-virtualized {
            height: 238px;
          }
        }
        @media all and (max-width: 500px), all and (max-height: 500px) {
          ha-list-selectable-virtualized {
            height: calc(
              100vh -
                210px - var(--safe-area-inset-top, 0px) - var(
                  --safe-area-inset-bottom,
                  0px
                )
            );
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-expose-entity": DialogExposeEntity;
  }
}
