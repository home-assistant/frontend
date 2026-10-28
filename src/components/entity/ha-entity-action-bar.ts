import type { ContextType } from "@lit/context";
import { mdiContentCopy, mdiInformationOutline } from "@mdi/js";
import { html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../common/decorators/consume";
import { fireEvent } from "../../common/dom/fire_event";
import { copyToClipboard } from "../../common/util/copy-clipboard";
import { internationalizationContext } from "../../data/context";
import { showMoreInfoDialog } from "../../dialogs/more-info/show-ha-more-info-dialog";
import { showToast } from "../../util/toast";
import { HaActionBar } from "../ha-action-bar";
import "../ha-button";
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

  protected render() {
    return html`
      <ha-button appearance="filled" size="s" @click=${this._showMoreInfo}>
        <ha-svg-icon slot="start" .path=${mdiInformationOutline}></ha-svg-icon>
        ${this._i18n.localize("ui.components.entity.entity-action-bar.view")}
      </ha-button>
      <ha-button appearance="filled" size="s" @click=${this._copyEntityId}>
        <ha-svg-icon slot="start" .path=${mdiContentCopy}></ha-svg-icon>
        ${this._i18n.localize("ui.components.entity.entity-action-bar.copy_id")}
      </ha-button>
    `;
  }

  private _showMoreInfo() {
    if (!this.entityId) {
      return;
    }
    fireEvent(this, "close-picker");
    showMoreInfoDialog(this, { entityId: this.entityId });
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
