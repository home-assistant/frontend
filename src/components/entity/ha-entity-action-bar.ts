import type { ContextType } from "@lit/context";
import { mdiContentCopy } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../common/decorators/consume";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import { copyToClipboard } from "../../common/util/copy-clipboard";
import {
  formattersContext,
  internationalizationContext,
} from "../../data/context";
import { showMoreInfoDialog } from "../../dialogs/more-info/show-ha-more-info-dialog";
import { showToast } from "../../util/toast";
import { HaActionBar } from "../ha-action-bar";
import "../ha-button";
import "../ha-icon-next";
import "../ha-svg-icon";

/**
 * @element ha-entity-action-bar
 *
 * @summary Action bar for a selected entity, placed below the list of an
 * entity or target picker. Opens the more info dialog of the entity or copies
 * its entity ID.
 *
 * @cssprop --ha-action-bar-border-top - Top border of the bar. Defaults to `var(--ha-border-width-sm) solid var(--divider-color)`.
 *
 * @fires close-picker - Fired after an action, so the picker around the bar closes.
 */
@customElement("ha-entity-action-bar")
export class HaEntityActionBar extends HaActionBar {
  @property({ attribute: "entity-id" }) public entityId?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: ContextType<typeof formattersContext>;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _stateObj?: HassEntity;

  protected render() {
    const name = this._stateObj
      ? this._formatters.formatEntityName(this._stateObj)
      : undefined;
    const viewLabel = name
      ? this._i18n.localize(
          "ui.components.entity.entity-action-bar.view_entity",
          { name }
        )
      : nothing;
    const copyIdLabel = name
      ? this._i18n.localize(
          "ui.components.entity.entity-action-bar.copy_entity_id",
          { name }
        )
      : nothing;

    return html`
      <ha-button
        appearance="filled"
        variant="neutral"
        size="s"
        title=${viewLabel}
        accessible-label=${viewLabel}
        @click=${this._showMoreInfo}
      >
        ${this._i18n.localize("ui.components.entity.entity-action-bar.view")}
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-button>
      <ha-button
        appearance="filled"
        variant="neutral"
        size="s"
        title=${copyIdLabel}
        accessible-label=${copyIdLabel}
        @click=${this._copyEntityId}
      >
        <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
        ${this._i18n.localize("ui.components.entity.entity-action-bar.copy_id")}
      </ha-button>
    `;
  }

  private _showMoreInfo() {
    if (!this.entityId) {
      return;
    }
    const entityId = this.entityId;
    fireEvent(this, "close-picker", {
      afterClose: () => showMoreInfoDialog(this, { entityId }),
    });
  }

  private async _copyEntityId() {
    if (!this.entityId) {
      return;
    }
    await copyToClipboard(this.entityId);
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
    });
    fireEvent(this, "close-picker");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-action-bar": HaEntityActionBar;
  }
}
