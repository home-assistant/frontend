import { consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../common/decorators/consume-context-entry";
import { truncateWithEllipsis } from "../common/string/truncate-with-ellipsis";
import { formattersContext } from "../data/context";

/**
 * Cap on the text written into the cell. Nothing beyond roughly this much is
 * readable in a table cell, and the containing cell's `text-overflow` is the
 * visible indicator, so the cut itself appends nothing.
 */
const MAX_CELL_LENGTH = 100;

/**
 * Cap on the hover title, which holds more than the cell shows. Nothing bounds
 * the length of a formatted state: core validates raw states to 255 characters,
 * but a state can be displayed through an integration's own translation, and
 * that translation and the unit appended after it are both arbitrary strings.
 * A cut here is marked, because unlike the cell there is no ellipsis to see.
 * `truncateWithEllipsis` only appends the marker when it actually shortens, and
 * its guard counts the marker, so a state of up to 256 characters passes
 * through whole and 257 or more becomes 255 characters plus the marker.
 */
const MAX_TITLE_LENGTH = 255;

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

    const formatted =
      this._stateObj && this._formatters
        ? this._formatters.formatEntityState(this._stateObj)
        : // Disabled or not provided, or a helper with no entity at all.
          "—";

    // textContent, never innerHTML: a state is arbitrary text from an
    // integration or a template and must not be parsed as markup.
    this.textContent = truncateWithEllipsis(formatted, MAX_CELL_LENGTH, "");

    if (formatted.length > MAX_CELL_LENGTH) {
      // Carries what the cell had to drop. `ha-data-table` builds its own hover
      // title from the cell's text, which is the truncated copy, so this title
      // on the inner element takes precedence over it where the text is.
      this.title = truncateWithEllipsis(formatted, MAX_TITLE_LENGTH, "…");
    } else {
      // removeAttribute, not `title = ""`: an empty title attribute means "no
      // advisory information" and suppresses the cell's title as well, which is
      // what reveals a state clipped by the cell rather than by the cap.
      this.removeAttribute("title");
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-state": HaEntityIdState;
  }
}
