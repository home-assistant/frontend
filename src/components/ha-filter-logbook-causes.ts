import type { ContextType } from "@lit/context";
import {
  mdiDotsHorizontal,
  mdiFilterVariantRemove,
  mdiPuzzle,
  mdiRobot,
  mdiScriptText,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { stringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  formattersContext,
  internationalizationContext,
  statesContext,
} from "../data/context";
import type { LogbookCauseGroup } from "../data/logbook";
import { LOGBOOK_CAUSE_GROUPS, logbookUserCauseKey } from "../data/logbook";
import type { User } from "../data/user";
import "./ha-expansion-panel";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import "./list/ha-list-selectable";
import type { HaListSelectable } from "./list/ha-list-selectable";
import "./user/ha-user-badge";

interface PersonUser {
  id: string;
  name: string;
}

const GROUP_ICONS: Record<LogbookCauseGroup, string> = {
  automation: mdiRobot,
  script: mdiScriptText,
  integration: mdiPuzzle,
  other: mdiDotsHorizontal,
};

@customElement("ha-filter-logbook-causes")
export class HaFilterLogbookCauses extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: internationalizationContext, subscribe: true })
  @state()
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: statesContext, subscribe: true })
  @state()
  private _states!: ContextType<typeof statesContext>;

  @consume({ context: formattersContext, subscribe: true })
  @state()
  private _formatters!: ContextType<typeof formattersContext>;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @query("ha-list-selectable") private _list?: HaListSelectable;

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  protected render() {
    const count = this.value?.length ?? 0;

    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this._localize("ui.components.logbook.cause_filter.caption")}
          ${
            count
              ? html`<div class="badge">${count}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    .label=${this._localize(
                      "ui.components.subpage-data-table.clear_filter"
                    )}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${this._panel.showContent ? this._renderContent() : nothing}
    `;
  }

  private _renderContent() {
    const users = this._personUsers(
      this._states,
      this._formatters,
      this._i18n.locale.language
    );
    const value = this.value ?? [];

    return html`<div class="content" ${ref(this._content)}>
      <ha-list-selectable
        multi
        controlled
        aria-label=${this._localize("ui.components.logbook.cause_filter.caption")}
        @ha-list-item-selected=${this._handleItemToggled}
        @ha-list-item-deselected=${this._handleItemToggled}
      >
        ${repeat(
          users,
          (user) => user.id,
          (user) => {
            const key = logbookUserCauseKey(user.id);
            return html`<ha-list-item-option
              appearance="checkbox"
              selection-position="end"
              .value=${key}
              .selected=${value.includes(key)}
            >
              <ha-user-badge slot="start" .user=${user as User}></ha-user-badge>
              <span slot="headline">${user.name}</span>
            </ha-list-item-option>`;
          }
        )}
        ${LOGBOOK_CAUSE_GROUPS.map(
          (group) =>
            html`<ha-list-item-option
              appearance="checkbox"
              selection-position="end"
              .value=${group}
              .selected=${value.includes(group)}
            >
              <ha-svg-icon
                slot="start"
                .path=${GROUP_ICONS[group]}
              ></ha-svg-icon>
              <span slot="headline"
                >${this._localize(
                  `ui.components.logbook.cause_filter.${group}`
                )}</span
              >
            </ha-list-item-option>`
        )}
      </ha-list-selectable>
    </div>`;
  }

  private _personUsers = memoizeOne(
    (
      states: ContextType<typeof statesContext>,
      formatters: ContextType<typeof formattersContext>,
      language: string | undefined
    ): PersonUser[] =>
      Object.values(states)
        .filter(
          (stateObj) =>
            computeStateDomain(stateObj) === "person" &&
            stateObj.attributes.user_id
        )
        .map((stateObj) => ({
          id: stateObj.attributes.user_id as string,
          name: formatters.formatEntityName(stateObj),
        }))
        .sort((a, b) => stringCompare(a.name, b.name, language))
  );

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private _handleItemToggled(ev: CustomEvent<number>) {
    const option = this._list?.items[ev.detail] as HaListItemOption | undefined;
    const key = option?.value;
    if (!key) {
      return;
    }
    const value = new Set(this.value ?? []);
    if (!value.delete(key)) {
      value.add(key);
    }
    this.value = [...value];
    fireEvent(this, "data-table-filter-changed", {
      value: this.value.length ? this.value : undefined,
      items: undefined,
    });
  }

  private _clearFilter(ev: Event) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      filterPanelStyles,
      css`
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
          flex: 1;
          min-height: 0;
        }
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        ha-user-badge {
          width: 24px;
          height: 24px;
          font-size: var(--ha-font-size-xs);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-logbook-causes": HaFilterLogbookCauses;
  }
}
