import type { ContextType } from "@lit/context";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import "../components/entity/state-badge";
import "../components/ha-control-select-menu";
import type { HaDropdownSelectEvent } from "../components/ha-dropdown";
import { apiContext, formattersContext } from "../data/context";
import { UNAVAILABLE } from "../data/entity/entity";
import type { SelectEntity } from "../data/select";
import { setSelectOption } from "../data/select";

@customElement("state-card-select")
class StateCardSelect extends LitElement {
  @property({ attribute: false }) public stateObj!: SelectEntity;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: ContextType<typeof formattersContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected render(): TemplateResult {
    const options = this.stateObj.attributes.options.map((option) => ({
      value: option,
      label:
        this._formatters?.formatEntityState(this.stateObj, option) ?? option,
    }));

    return html`
      <state-badge .stateObj=${this.stateObj}></state-badge>
      <ha-control-select-menu
        .value=${this.stateObj.state}
        .label=${this._formatters?.formatEntityName(this.stateObj, {
          type: "entity",
        })}
        .options=${options}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        hide-label
        show-arrow
        @wa-select=${this._selectedOptionChanged}
      ></ha-control-select-menu>
    `;
  }

  private async _selectedOptionChanged(ev: HaDropdownSelectEvent) {
    const option = ev.detail.item?.value;
    if (
      !option ||
      option === this.stateObj.state ||
      !this.stateObj.attributes.options.includes(option)
    ) {
      return;
    }
    await setSelectOption(
      this._api.callService,
      this.stateObj.entity_id,
      option
    );
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }

    ha-control-select-menu {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-select": StateCardSelect;
  }
}
