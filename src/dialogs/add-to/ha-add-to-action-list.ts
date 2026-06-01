import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-icon";
import "../../components/ha-svg-icon";
import "../../components/item/ha-list-item-base";
import type { HaListItemButton } from "../../components/item/ha-list-item-button";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";

export interface AddToActionListItem {
  name: string;
  description?: string;
  icon?: string;
  iconPath?: string;
  enabled?: boolean;
}

export interface AddToActionListSection<
  Item extends AddToActionListItem = AddToActionListItem,
> {
  title: string;
  actions: readonly Item[];
  empty?: string;
}

export interface AddToActionListActionSelectedDetail<
  Item extends AddToActionListItem = AddToActionListItem,
> {
  action: Item;
}

export type AddToActionListActionSelectedEvent<
  Item extends AddToActionListItem = AddToActionListItem,
> = HASSDomEvent<AddToActionListActionSelectedDetail<Item>>;

type AddToActionListItemButton = HaListItemButton & {
  action: AddToActionListItem;
};

@customElement("ha-add-to-action-list")
export class HaAddToActionList extends LitElement {
  @property({ attribute: false })
  public sections: readonly AddToActionListSection[] = [];

  protected render(): TemplateResult | typeof nothing {
    if (!this.sections.length) {
      return nothing;
    }

    return html`${this.sections.map((section) => this._renderSection(section))}`;
  }

  private _renderSection(
    section: AddToActionListSection
  ): TemplateResult | typeof nothing {
    if (!section.actions.length && !section.empty) {
      return nothing;
    }

    return html`
      <h3 class="section-header">${section.title}</h3>
      <ha-list-base>
        ${section.actions.length
          ? section.actions.map((action) => this._renderActionItem(action))
          : html`<ha-list-item-base
              .headline=${section.empty}
            ></ha-list-item-base>`}
      </ha-list-base>
    `;
  }

  private _renderActionItem(action: AddToActionListItem): TemplateResult {
    return html`
      <ha-list-item-button
        .disabled=${action.enabled === false}
        .action=${action}
        .headline=${action.name}
        .supportingText=${action.description}
        @click=${this._actionSelected}
      >
        ${action.icon
          ? html`<ha-icon slot="start" .icon=${action.icon}></ha-icon>`
          : action.iconPath
            ? html`<ha-svg-icon
                slot="start"
                .path=${action.iconPath}
              ></ha-svg-icon>`
            : nothing}
      </ha-list-item-button>
    `;
  }

  private _actionSelected(
    ev: HASSDomCurrentTargetEvent<AddToActionListItemButton>
  ): void {
    if (ev.currentTarget.action.enabled === false) {
      return;
    }

    fireEvent(this, "add-to-list-action-selected", {
      action: ev.currentTarget.action,
    });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    .section-header {
      padding: var(--ha-space-2) var(--ha-space-4) 0;
      margin: 0;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      color: var(--secondary-text-color);
    }

    ha-icon,
    ha-svg-icon {
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-add-to-action-list": HaAddToActionList;
  }

  interface HASSDomEvents {
    "add-to-list-action-selected": AddToActionListActionSelectedDetail;
  }
}
