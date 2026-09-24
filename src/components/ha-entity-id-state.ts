import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../common/decorators/consume-context-entry";
import { truncateWithEllipsis } from "../common/string/truncate-with-ellipsis";
import { formattersContext } from "../data/context";

/** Longest state written into the cell; the cell's `text-overflow` shows the cut. */
const MAX_CELL_LENGTH = 100;

/** Longest state carried in the hover title, which is marked when it is cut. */
const MAX_TITLE_LENGTH = 255;

/**
 * Formatted state for an entity ID, subscribing to that entity itself rather
 * than taking a state object from its parent, so a virtualized table can show
 * live states without rebuilding its rows.
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

  // Light DOM, so the cell holding this text clips it with `text-overflow`
  // and can read it back for its own hover title.
  protected createRenderRoot() {
    return this;
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);

    const formatted =
      this._stateObj && this._formatters
        ? this._formatters.formatEntityState(this._stateObj)
        : "—";

    this.textContent = truncateWithEllipsis(formatted, MAX_CELL_LENGTH, "");

    if (formatted.length > MAX_CELL_LENGTH) {
      this.title = truncateWithEllipsis(formatted, MAX_TITLE_LENGTH, "…");
    } else {
      // `title=""` means "no advisory information" and would suppress the
      // cell's own overflow title as well.
      this.removeAttribute("title");
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-state": HaEntityIdState;
  }
}
