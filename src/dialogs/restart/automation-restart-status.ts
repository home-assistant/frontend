import { LitElement, html } from "lit";
import { consume, type ContextType } from "@lit/context";
import { customElement, state } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import type { EntityNameItem } from "../../common/entity/compute_entity_name_display";
import { STRINGS_SEPARATOR_DOT } from "../../common/const";
import {
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../../data/context";

const ENTITY_NAME_FORMAT: EntityNameItem[] = [
  { type: "entity" },
  { type: "area" },
] as const;
const ENTITY_NAME_OPTIONS = { separator: STRINGS_SEPARATOR_DOT } as const;

@customElement("automation-restart-status")
class AutomationRestartStatus extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: statesContext, subscribe: true })
  private _states!: ContextType<typeof statesContext>;

  protected render() {
    const automations = Object.values(this._states).filter((s) => {
      const domain = computeDomain(s.entity_id);
      return (
        (domain === "script" || domain === "automation") && s.attributes.current
      );
    });

    return automations.length
      ? html`${this._i18n.localize("ui.dialogs.restart.interrupt_automations")}
          <ul>
            ${automations.map((a) => html`<li>${this._formatters.formatEntityName(a, ENTITY_NAME_FORMAT, ENTITY_NAME_OPTIONS)}</li>`)}
          </ul>`
      : html`${this._i18n.localize("ui.dialogs.restart.no_interrupt_automations")}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "automation-restart-status": AutomationRestartStatus;
  }
}
