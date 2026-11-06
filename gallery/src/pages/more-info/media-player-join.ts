import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../../src/components/ha-button";
import "../../../../src/components/media-player/dialog-join-media-players";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import { createGroupedMediaPlayerEntities } from "../../data/media_players";

const ENTITIES = createGroupedMediaPlayerEntities();

@customElement("demo-more-info-media-player-join")
class DemoMoreInfoMediaPlayerJoin extends LitElement {
  @property({ attribute: false }) public hass?: MockHomeAssistant;

  @query("dialog-join-media-players")
  private _dialog!: HTMLElementTagNameMap["dialog-join-media-players"];

  protected render() {
    return html`
      <div class="content">
        <ha-button @click=${this._openDialog}>Open dialog</ha-button>
      </div>
      ${
        // The dialog consumes contexts, so the providers must exist first
        this.hass
          ? html`<dialog-join-media-players></dialog-join-media-players>`
          : nothing
      }
    `;
  }

  protected async firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this);
    await hass.updateTranslations(null, "en");
    hass.addEntities(ENTITIES);
    hass.mockService("media_player", "join", (data, target) =>
      this._setGroup(target!.entity_id as string, data!.group_members)
    );
    hass.mockService("media_player", "unjoin", (_data, target) =>
      this._leaveGroup(target!.entity_id as string)
    );
    await this.updateComplete;
    this._openDialog();
  }

  private _withMembers(entityId: string, groupMembers: string[]) {
    const stateObj = this.hass!.states[entityId];
    return {
      [entityId]: {
        ...stateObj,
        attributes: { ...stateObj.attributes, group_members: groupMembers },
      },
    };
  }

  private _setGroup(leader: string, members: string[]) {
    const group = [leader, ...members];
    this.hass!.updateStates(
      Object.assign(
        {},
        ...group.map((entityId) => this._withMembers(entityId, group))
      )
    );
  }

  private _leaveGroup(entityId: string) {
    const stateObj = this.hass!.states[entityId];
    const remaining: string[] = stateObj.attributes.group_members.filter(
      (id: string) => id !== entityId
    );
    this.hass!.updateStates(
      Object.assign(
        this._withMembers(entityId, [entityId]),
        ...remaining.map((id) => this._withMembers(id, remaining))
      )
    );
  }

  private _openDialog() {
    this._dialog.showDialog({ entityId: ENTITIES[0].entity_id });
  }

  static styles = css`
    .content {
      padding: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info-media-player-join": DemoMoreInfoMediaPlayerJoin;
  }
}
