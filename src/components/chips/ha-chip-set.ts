import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators";
import { HaChipBase } from "./ha-chip-base";

@customElement("ha-chip-set")
export class HaChipSet extends LitElement {
  @property({ attribute: "aria-label", reflect: true })
  public override ariaLabel: string | null = null;

  @property({ attribute: "aria-labelledby", reflect: true })
  public ariaLabelledBy?: string;

  @queryAssignedElements({ flatten: true }) private _children!: HTMLElement[];

  get chips(): HaChipBase[] {
    return this._children.filter(
      (child): child is HaChipBase => child instanceof HaChipBase
    );
  }

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._handleKeyDown);
    this.addEventListener("focusin", this._updateTabIndices);
    this.addEventListener("update-focus", this._updateTabIndices);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeyDown);
    this.removeEventListener("focusin", this._updateTabIndices);
    this.removeEventListener("update-focus", this._updateTabIndices);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);

    // A toolbar needs a name when a page has several, so only use the role
    // when the chip set is labelled.
    if (changed.has("ariaLabel") || changed.has("ariaLabelledBy")) {
      this.setAttribute(
        "role",
        this.ariaLabel || this.ariaLabelledBy ? "toolbar" : "group"
      );
    }
  }

  protected render() {
    return html`<slot @slotchange=${this._updateTabIndices}></slot>`;
  }

  private _updateTabIndices() {
    const chips = this.chips;

    const active =
      chips.find((chip) => chip.focusable && chip.shadowRoot?.activeElement) ||
      chips.find((chip) => chip.focusable);

    for (const chip of chips) {
      chip.tabIndex = chip === active ? 0 : -1;
    }
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    const chips = this.chips.filter((chip) => chip.focusable);

    if (chips.length < 2) {
      return;
    }

    event.preventDefault();

    const forwards =
      (event.key === "ArrowRight") !==
      (getComputedStyle(this).direction === "rtl");

    const current = chips.findIndex((chip) => chip.shadowRoot?.activeElement);

    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? chips.length - 1
          : current === -1
            ? forwards
              ? 0
              : chips.length - 1
            : (current + (forwards ? 1 : -1) + chips.length) % chips.length;

    chips[index].focus({
      trailing: event.key === "End" || (event.key !== "Home" && !forwards),
    });
    this._updateTabIndices();
  }

  static styles = css`
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-chip-set": HaChipSet;
  }
}
