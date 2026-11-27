import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-alert";
import "../../../../components/ha-markdown";
import "../../../../components/ha-select";
import type {
  HaSelectOption,
  HaSelectSelectEvent,
} from "../../../../components/ha-select";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import { configContext } from "../../../../data/context";
import type {
  FixedCostEnergyPreference,
  FixedCostPeriod,
} from "../../../../data/energy";
import { emptyFixedCostEnergyPreference } from "../../../../data/energy";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import type { HomeAssistantConfig, ValueChangedEvent } from "../../../../types";
import type {
  EnergyEditorStatus,
  EnergyFixedCostEditorParams,
} from "./energy-editor";
import { EnergyEditorMixin, energyEditorStyles } from "./energy-editor";

type AmountType = "number" | "entity";

interface FixedCostFormState {
  cost: FixedCostEnergyPreference;
  amountType: AmountType;
}

const PERIODS: FixedCostPeriod[] = ["day", "month", "year"];

@customElement("ha-energy-fixed-cost-editor")
export class HaEnergyFixedCostEditor extends EnergyEditorMixin(
  DirtyStateProviderMixin<FixedCostFormState>()(LitElement)
) {
  @property({ attribute: false })
  public params!: EnergyFixedCostEditorParams;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, string>({
    transformer: ({ config }) => config.currency,
  })
  private _currency!: string;

  @state() private _cost?: FixedCostEnergyPreference;

  @state() private _amountType: AmountType = "number";

  @state() private _numberAmountText = "";

  @state() private _error?: string;

  @state() private _saving = false;

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("params")) {
      this._init();
    }
  }

  private _init() {
    const params = this.params;
    this._error = undefined;
    this._saving = false;
    this._cost = params.cost
      ? { ...params.cost }
      : emptyFixedCostEnergyPreference(params.type);
    this._amountType = this._cost.entity_amount ? "entity" : "number";
    this._numberAmountText =
      typeof this._cost.number_amount === "number"
        ? String(this._cost.number_amount)
        : "";
    this._initDirtyTracking(
      { type: "deep" },
      { cost: this._cost, amountType: this._amountType }
    );
  }

  protected get editorStatus(): EnergyEditorStatus {
    const cost = this._cost;
    return {
      dirty: this.isDirtyState,
      valid:
        !!cost?.name.trim() &&
        (this._amountType === "number"
          ? Number.isFinite(cost.number_amount)
          : !!cost.entity_amount),
      saving: this._saving,
    };
  }

  protected render() {
    if (!this._cost) {
      return nothing;
    }

    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing
      }
      <ha-input
        .label=${this._localize(
          "ui.panel.config.energy.fixed_costs.dialog.name"
        )}
        type="text"
        required
        .disabled=${this._saving}
        .value=${this._cost.name}
        @input=${this._nameChanged}
      ></ha-input>
      <div class="group">
        <ha-select
          .label=${this._localize(
            "ui.panel.config.energy.fixed_costs.dialog.amount_type"
          )}
          .value=${this._amountType}
          .options=${this._amountTypeOptions()}
          .disabled=${this._saving}
          @selected=${this._amountTypeChanged}
        ></ha-select>
        ${this._renderAmount()}
      </div>
      <ha-select
        .label=${this._localize(
          "ui.panel.config.energy.fixed_costs.dialog.period"
        )}
        .helper=${this._localize(
          "ui.panel.config.energy.fixed_costs.dialog.period_helper"
        )}
        .value=${this._cost.period}
        .options=${this._periodOptions()}
        .disabled=${this._saving}
        @selected=${this._periodChanged}
      ></ha-select>
    `;
  }

  private _renderAmount() {
    if (this._amountType === "entity") {
      return html`<ha-entity-picker
        .disabled=${this._saving}
        include-domains='["sensor", "input_number"]'
        .value=${this._cost!.entity_amount ?? undefined}
        .label=${this._localize(
          "ui.panel.config.energy.fixed_costs.dialog.amount_entity_label"
        )}
        .helper=${html`<ha-markdown
          .content=${this._localize(
            "ui.panel.config.energy.fixed_costs.dialog.amount_entity_helper",
            { currency: this._currency, period: this._cost!.period }
          )}
        ></ha-markdown>`}
        @value-changed=${this._amountEntityChanged}
      ></ha-entity-picker>`;
    }
    return html`<ha-input
      .disabled=${this._saving}
      .label=${this._localize(
        "ui.panel.config.energy.fixed_costs.dialog.amount_number_label"
      )}
      .hint=${this._localize(
        "ui.panel.config.energy.fixed_costs.dialog.amount_number_helper"
      )}
      step="any"
      type="number"
      required
      auto-validate
      .value=${this._numberAmountText}
      @input=${this._numberAmountChanged}
    >
      <span slot="end">${this._currency}</span>
    </ha-input>`;
  }

  private _amountTypeOptions(): HaSelectOption[] {
    return [
      {
        value: "number",
        label: this._localize(
          "ui.panel.config.energy.fixed_costs.dialog.amount_number"
        ),
      },
      {
        value: "entity",
        label: this._localize(
          "ui.panel.config.energy.fixed_costs.dialog.amount_entity"
        ),
      },
    ];
  }

  private _periodOptions(): HaSelectOption[] {
    return PERIODS.map((period) => ({
      value: period,
      label: this._localize(
        `ui.panel.config.energy.fixed_costs.dialog.period_${period}`
      ),
    }));
  }

  private _nameChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    this._cost = { ...this._cost!, name: ev.currentTarget.value ?? "" };
    this._updateFormDirtyState();
  }

  private _amountTypeChanged(ev: HaSelectSelectEvent) {
    this._amountType = ev.detail.value as AmountType;
    this._updateFormDirtyState();
  }

  private _numberAmountChanged(ev: HASSDomCurrentTargetEvent<HaInput>) {
    // Render the typed text so partial input such as "-" is not rewritten
    this._numberAmountText = ev.currentTarget.value ?? "";
    const amount = parseFloat(this._numberAmountText);
    this._cost = {
      ...this._cost!,
      number_amount: Number.isFinite(amount) ? amount : null,
    };
    this._updateFormDirtyState();
  }

  private _amountEntityChanged(ev: ValueChangedEvent<string>) {
    this._cost = { ...this._cost!, entity_amount: ev.detail.value || null };
    this._updateFormDirtyState();
  }

  private _periodChanged(ev: HaSelectSelectEvent) {
    this._cost = {
      ...this._cost!,
      period: ev.detail.value as FixedCostPeriod,
    };
    this._updateFormDirtyState();
  }

  private _updateFormDirtyState(): void {
    this._updateDirtyState({ cost: this._cost!, amountType: this._amountType });
  }

  public async save(): Promise<boolean> {
    const params = this.params;
    const cost = this._cost!;
    const isNumber = this._amountType === "number";
    const isCurrent = () => this.params === params && this.isConnected;
    this._error = undefined;
    this._saving = true;
    try {
      await params.saveCallback({
        ...cost,
        name: cost.name.trim(),
        number_amount: isNumber ? cost.number_amount : null,
        entity_amount: isNumber ? null : cost.entity_amount,
      });
      if (isCurrent()) {
        this._markDirtyStateClean();
      }
      return true;
    } catch (err: any) {
      if (isCurrent()) {
        this._error = err.message;
      }
      return false;
    } finally {
      if (isCurrent()) {
        this._saving = false;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return energyEditorStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-fixed-cost-editor": HaEnergyFixedCostEditor;
  }
}
