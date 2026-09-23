import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../common/decorators/consume-context-entry";
import { truncateWithEllipsis } from "../common/string/truncate-with-ellipsis";
import { formattersContext } from "../data/context";

/**
 * Cap on the formatted state written into the DOM. Core validates states to 255
 * characters, so this is not a guard against something unbounded — it keeps a
 * long template rendering out of every visible row when none of it is readable
 * in a table cell anyway. The visible truncation indicator is the containing
 * cell's `text-overflow`, so the cut itself appends nothing.
 */
const MAX_STATE_LENGTH = 100;

/**
 * Formatted state for an entity ID, subscribing to that entity itself instead
 * of taking a state object from its parent. This lets a virtualized list show
 * live states without rebuilding its rows on every state change.
 */
@customElement("ha-entity-id-state")
export class HaEntityIdState extends ReactiveElement {
  @property({ attribute: false }) public entityId!: string;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: ContextType<typeof formattersContext>;

  // Light DOM, like ha-timer-remaining-time. The text becomes a direct child of
  // whatever cell holds it, so that container's own `overflow` and
  // `text-overflow` clip it — including `ha-data-table`'s narrow layout, which
  // folds secondary columns into one inline line beneath the name, and which a
  // block-level shadow host would break.
  protected createRenderRoot() {
    return this;
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);
    // textContent, never innerHTML: a state is arbitrary text from an
    // integration or a template and must not be parsed as markup.
    this.textContent =
      this._stateObj && this._formatters
        ? truncateWithEllipsis(
            this._formatters.formatEntityState(this._stateObj),
            MAX_STATE_LENGTH,
            ""
          )
        : // Disabled or not provided, or a helper with no entity at all.
          "—";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-state": HaEntityIdState;
  }
}
