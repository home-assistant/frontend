import { LitElement, html, css } from "lit";
import { property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../common/dom/fire_event";

class HaEntityMarker extends LitElement {
  @property({ attribute: "entity-id" }) public entityId?: string;

  @property({ attribute: "entity-name" }) public entityName?: string;

  @property({ attribute: "entity-picture" }) public entityPicture?: string;

  @property({ attribute: "entity-color" }) public entityColor?: string;

  protected render() {
    return html`
      <div
        class="marker ${this.entityPicture ? "picture" : ""}"
        style=${styleMap({ "border-color": this.entityColor })}
        @click=${this._badgeTap}
      >
        ${this.entityPicture
          ? html`<div
              class="entity-picture"
              style=${styleMap({
                "background-image": `url(${this.entityPicture})`,
              })}
            ></div>`
          : this.entityName}
      </div>
    `;
  }

  private _badgeTap(ev: Event) {
    ev.stopPropagation();
    if (this.entityId) {
      fireEvent(this, "hass-more-info", { entityId: this.entityId });
    }
  }

  static get styles() {
    return css`
      .marker {
        display: flex;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        width: 48px;
        height: 48px;
        font-size: var(--ha-marker-font-size, 1.5em);
        border-radius: 50%;
        border: 1px solid var(--ha-marker-color, var(--primary-color));
        color: var(--primary-text-color);
        background-color: var(--card-background-color);
      }
      .marker.picture {
        overflow: hidden;
      }
      .entity-picture {
        background-size: cover;
        height: 100%;
        width: 100%;
      }
    `;
  }
}

customElements.define("ha-entity-marker", HaEntityMarker);

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-marker": HaEntityMarker;
  }
}
