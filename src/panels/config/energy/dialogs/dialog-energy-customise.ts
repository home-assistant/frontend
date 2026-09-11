import { consume, type ContextType } from "@lit/context";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-spinner";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/ha-tooltip";
import {
  connectionContext,
  internationalizationContext,
} from "../../../../data/context";
import {
  fetchFrontendSystemData,
  saveFrontendSystemData,
} from "../../../../data/frontend";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../../resources/styles";
import { showToast } from "../../../../util/toast";
import type {
  EnergyCardCatalogEntry,
  EnergyViewPath,
} from "../../../energy/strategies/energy-cards";
import { ENERGY_CARD_CATALOG } from "../../../energy/strategies/energy-cards";
import type { EnergyCustomiseDialogParams } from "./show-dialog-energy-customise";

const VIEW_GROUPS: { view: EnergyViewPath; labelKey: LocalizeKeys }[] = [
  {
    view: "overview",
    labelKey: "ui.panel.config.energy.customise.groups.overview",
  },
  { view: "electricity", labelKey: "ui.panel.config.energy.tabs.electricity" },
  { view: "gas", labelKey: "ui.panel.config.energy.tabs.gas" },
  { view: "water", labelKey: "ui.panel.config.energy.tabs.water" },
  { view: "now", labelKey: "ui.panel.config.energy.customise.groups.now" },
];

@customElement("dialog-energy-customise")
export class DialogEnergyCustomise
  extends DirtyStateProviderMixin<string[]>()(LitElement)
  implements HassDialog<EnergyCustomiseDialogParams>
{
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state() private _params?: EnergyCustomiseDialogParams;

  @state() private _open = false;

  @state() private _error?: string;

  @state() private _submitting = false;

  // Working copy of the hidden card keys. A switch that is ON means the card is
  // visible, i.e. its key is NOT in this set.
  @state() private _hidden?: Set<string>;

  public showDialog(params: EnergyCustomiseDialogParams): void {
    this._params = params;
    this._open = true;
    this._loadHidden();
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._hidden = undefined;
    this._error = undefined;
    this._submitting = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _loadHidden(): Promise<void> {
    this._error = undefined;
    // showDialog runs before the dialog is connected to the DOM, so wait for
    // the first update to ensure the consumed contexts have resolved.
    await this.updateComplete;
    if (!this._params) {
      return;
    }
    try {
      // The card labels reuse keys from the "energy" translation fragment,
      // which is not guaranteed to be loaded on the config page.
      const [data] = await Promise.all([
        fetchFrontendSystemData(this._connection.connection, "energy"),
        this._i18n.loadFragmentTranslation("energy"),
      ]);
      this._hidden = new Set(data?.hidden_cards ?? []);
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
      this._hidden = new Set();
    }
    this._initDirtyTracking({ type: "deep" }, [...this._hidden].sort());
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${this._i18n.localize(
          "ui.panel.config.energy.customise.title"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${
          !this._hidden
            ? html`<div class="loading">
                <ha-spinner size="large"></ha-spinner>
              </div>`
            : this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : html`<div class="groups">${this._renderGroups()}</div>`
        }

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
            .disabled=${this._submitting}
          >
            ${this._i18n.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${
              this._submitting ||
              !this._hidden ||
              !!this._error ||
              !this.isDirtyState
            }
          >
            ${this._i18n.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderGroups() {
    const prefs = this._params!.preferences;
    return VIEW_GROUPS.map((group) => {
      const cards = ENERGY_CARD_CATALOG.filter((c) => c.view === group.view);
      // Hide the whole group when none of its cards apply to the current config.
      if (!cards.some((c) => c.isApplicable(prefs))) {
        return nothing;
      }
      return html`
        <ha-expansion-panel
          outlined
          expanded
          .header=${this._i18n.localize(group.labelKey)}
        >
          <div class="cards">
            ${cards.map((card) => this._renderCardRow(card))}
          </div>
        </ha-expansion-panel>
      `;
    });
  }

  private _renderCardRow(card: EnergyCardCatalogEntry) {
    const applicable = card.isApplicable(this._params!.preferences);
    const label = this._i18n.localize(card.labelKey);
    const rowId = `row-${card.key}`;
    return html`
      <ha-settings-row slim id=${rowId}>
        <span slot="heading" class=${applicable ? "" : "disabled"}
          >${label}</span
        >
        <ha-switch
          .checked=${applicable && !this._hidden!.has(card.key)}
          .disabled=${!applicable}
          .ariaLabel=${label}
          data-card-key=${card.key}
          @change=${this._toggleCard}
        ></ha-switch>
      </ha-settings-row>
      ${
        applicable
          ? nothing
          : html`
              <ha-tooltip .for=${rowId} placement="top">
                ${this._i18n.localize(
                  "ui.panel.config.energy.customise.unavailable"
                )}
              </ha-tooltip>
            `
      }
    `;
  }

  private _toggleCard = (ev: HASSDomCurrentTargetEvent<HaSwitch>): void => {
    const target = ev.currentTarget as HaSwitch;
    const cardKey = target.dataset.cardKey;
    if (!cardKey) {
      return;
    }
    const next = new Set(this._hidden);
    if (target.checked) {
      next.delete(cardKey);
    } else {
      next.add(cardKey);
    }
    this._hidden = next;
    this._updateDirtyState([...this._hidden].sort());
  };

  private async _save(): Promise<void> {
    if (!this._hidden) {
      return;
    }
    this._submitting = true;
    try {
      const hidden = Array.from(this._hidden);
      await saveFrontendSystemData(this._connection.connection, "energy", {
        hidden_cards: hidden.length ? hidden : undefined,
      });
      this._markDirtyStateClean();
      this._params?.saveCallback?.();
      this.closeDialog();
    } catch (_err) {
      showToast(this, {
        message: this._i18n.localize(
          "ui.panel.config.energy.customise.save_failed"
        ),
        duration: 0,
        dismissable: true,
      });
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: var(--ha-space-2) var(--ha-space-6);
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-6);
        }
        span.disabled {
          color: var(--disabled-text-color);
        }
        .groups {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }
        ha-expansion-panel {
          display: block;
          --expansion-panel-content-padding: 0;
          --expansion-panel-summary-padding: 0 var(--ha-space-4);
          border-radius: var(--ha-border-radius-md);
          --ha-card-border-radius: var(--ha-border-radius-md);
        }
        .cards {
          padding: 0 var(--ha-space-4);
        }
        .cards ha-settings-row {
          min-height: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-energy-customise": DialogEnergyCustomise;
  }
}
