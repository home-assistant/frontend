import {
  mdiAccount,
  mdiChevronRight,
  mdiCog,
  mdiHome,
  mdiInformationOutline,
  mdiMapMarker,
  mdiOpenInNew,
  mdiPencil,
  mdiViewDashboard,
  mdiWifi,
} from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/item/ha-list-item-base";
import "../../../../src/components/item/ha-list-item-button";
import "../../../../src/components/item/ha-list-item-option";
import "../../../../src/components/item/ha-list-item-todo";
import "../../../../src/components/list/ha-list-base";
import "../../../../src/components/list/ha-list-box";
import "../../../../src/components/list/ha-list-nav";
import type { HaListSelectedDetail } from "../../../../src/components/list/types";

type Appearance = "line" | "checkbox";
type Position = "start" | "end";

const appearances: Appearance[] = ["line", "checkbox"];
const positions: Position[] = ["start", "end"];
const selectedStates = [false, true];
const disabledStates = [false, true];

interface Todo {
  id: string;
  text: string;
  checked: boolean;
}

@customElement("demo-components-ha-list")
export class DemoHaList extends LitElement {
  @state() private _buttonClicks = 0;

  @state() private _single: number | Set<number> = -1;

  @state() private _multiLine: number | Set<number> = new Set();

  @state() private _multiCheckStart: number | Set<number> = new Set();

  @state() private _multiCheckEnd: number | Set<number> = new Set();

  @state() private _todos: Todo[] = [
    { id: "a", text: "Buy milk", checked: false },
    { id: "b", text: "Walk the dog", checked: true },
    { id: "c", text: "Write docs", checked: false },
  ];

  @state() private _lastToggle = "(none)";

  @state() private _lastClick = "(none)";

  @state() private _sortRows = [
    "Apple",
    "Banana",
    "Cherry",
    "Date",
    "Elderberry",
  ];

  @state() private _handleRows = ["One", "Two", "Three", "Four"];

  @state() private _lastMove = "(none)";

  private _options = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

  protected render(): TemplateResult {
    return html`
      <h2>ha-list-base</h2>
      <p>
        Styled container with keyboard focus navigation. Children should be
        <code>ha-list-item-*</code>.
      </p>

      <ha-card header="Info list (non-interactive rows)">
        <ha-list-base aria-label="Device info">
          <ha-list-item-base
            headline="IP address"
            supporting-text="192.168.1.42"
          >
            <ha-svg-icon slot="start" .path=${mdiWifi}></ha-svg-icon>
          </ha-list-item-base>
          <ha-list-item-base headline="Location" supporting-text="Living room">
            <ha-svg-icon slot="start" .path=${mdiMapMarker}></ha-svg-icon>
          </ha-list-item-base>
          <ha-list-item-base headline="Firmware" supporting-text="2026.4.1">
            <ha-svg-icon
              slot="start"
              .path=${mdiInformationOutline}
            ></ha-svg-icon>
          </ha-list-item-base>
        </ha-list-base>
      </ha-card>

      <ha-card header="Vertical list (default)">
        <ha-list-base aria-label="Example list">
          <ha-list-item-button>
            <ha-svg-icon slot="start" .path=${mdiHome}></ha-svg-icon>
            <span slot="headline">First row</span>
            <span slot="supporting-text">Supporting text</span>
            <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
          </ha-list-item-button>
          <ha-list-item-button>
            <ha-svg-icon slot="start" .path=${mdiAccount}></ha-svg-icon>
            <span slot="headline">Second row</span>
          </ha-list-item-button>
          <ha-list-item-button disabled>
            <span slot="headline">Disabled row</span>
          </ha-list-item-button>
          <ha-list-item-button>
            <span slot="headline">Fourth row</span>
          </ha-list-item-button>
        </ha-list-base>
      </ha-card>

      <ha-card header="Vertical list with wrap-focus">
        <ha-list-base wrap-focus aria-label="Wrap focus">
          <ha-list-item-button>
            <span slot="headline">A</span>
          </ha-list-item-button>
          <ha-list-item-button>
            <span slot="headline">B</span>
          </ha-list-item-button>
          <ha-list-item-button>
            <span slot="headline">C</span>
          </ha-list-item-button>
        </ha-list-base>
      </ha-card>

      <h2>ha-list-item-base</h2>
      <p>Non-interactive base row with slot permutations.</p>

      <ha-card header="Slot permutations">
        <ha-list-base aria-label="Slot permutations">
          <ha-list-item-base headline="Headline only"></ha-list-item-base>
          <ha-list-item-base
            headline="Headline"
            supporting-text="Supporting text"
          ></ha-list-item-base>
          <ha-list-item-base headline="Start + headline">
            <ha-svg-icon slot="start" .path=${mdiHome}></ha-svg-icon>
          </ha-list-item-base>
          <ha-list-item-base headline="Start + headline + end">
            <ha-svg-icon slot="start" .path=${mdiHome}></ha-svg-icon>
            <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
          </ha-list-item-base>
          <ha-list-item-base
            headline="Full row"
            supporting-text="All slots filled"
          >
            <ha-svg-icon slot="start" .path=${mdiHome}></ha-svg-icon>
            <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
          </ha-list-item-base>
          <ha-list-item-base>
            <div slot="content" class="custom-content">
              <strong>Custom content escape hatch</strong>
              <span>Replaces the whole middle column</span>
            </div>
          </ha-list-item-base>
          <ha-list-item-base headline="Disabled row" disabled>
            <ha-svg-icon slot="start" .path=${mdiHome}></ha-svg-icon>
          </ha-list-item-base>
        </ha-list-base>
      </ha-card>

      <h2>ha-list-item-button</h2>
      <p>
        Interactive row. Renders an inner <code>&lt;a&gt;</code> when
        <code>href</code> is set, otherwise a <code>&lt;button&gt;</code>.
      </p>

      <ha-card header="Button (default) / link (with href)">
        <ha-list-base aria-label="Button items">
          <ha-list-item-button @click=${this._onButtonClick}>
            <ha-svg-icon slot="start" .path=${mdiHome}></ha-svg-icon>
            <span slot="headline">Button (clicks: ${this._buttonClicks})</span>
          </ha-list-item-button>
          <ha-list-item-button
            href="https://www.home-assistant.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ha-svg-icon slot="start" .path=${mdiOpenInNew}></ha-svg-icon>
            <span slot="headline">Link (opens in new tab)</span>
            <span slot="supporting-text"
              >Cmd/Ctrl-click still opens in new tab</span
            >
          </ha-list-item-button>
          <ha-list-item-button disabled>
            <span slot="headline">Disabled button</span>
          </ha-list-item-button>
          <ha-list-item-button href="#nope" disabled>
            <span slot="headline">Disabled link</span>
          </ha-list-item-button>
        </ha-list-base>
      </ha-card>

      <h2>ha-list-box + ha-list-item-option</h2>
      <p>
        Selectable list (<code>role="listbox"</code>). Items must be
        <code>ha-list-item-option</code>. Set <code>multi</code> for
        multi-select.
      </p>

      <ha-card header="Single select, appearance=line">
        <ha-list-box
          aria-label="Single select"
          @ha-list-selected=${this._onSingle}
        >
          ${this._options.map(
            (o, i) => html`
              <ha-list-item-option
                .value=${o}
                ?selected=${this._isSel(this._single, i)}
              >
                <span slot="headline">${o}</span>
              </ha-list-item-option>
            `
          )}
        </ha-list-box>
        <pre>selected: ${JSON.stringify(this._toJson(this._single))}</pre>
      </ha-card>

      <ha-card header="Multi select, appearance=line">
        <ha-list-box
          multi
          aria-label="Multi select line"
          @ha-list-selected=${this._onMultiLine}
        >
          ${this._options.map(
            (o, i) => html`
              <ha-list-item-option
                .value=${o}
                ?selected=${this._isSel(this._multiLine, i)}
              >
                <span slot="headline">${o}</span>
              </ha-list-item-option>
            `
          )}
        </ha-list-box>
        <pre>selected: ${JSON.stringify(this._toJson(this._multiLine))}</pre>
      </ha-card>

      <ha-card
        header='Multi select, appearance=checkbox, selection-position="start"'
      >
        <ha-list-box
          multi
          aria-label="Multi checkbox start"
          @ha-list-selected=${this._onMultiCheckStart}
        >
          ${this._options.map(
            (o, i) => html`
              <ha-list-item-option
                appearance="checkbox"
                selection-position="start"
                .value=${o}
                ?selected=${this._isSel(this._multiCheckStart, i)}
              >
                <span slot="headline">${o}</span>
              </ha-list-item-option>
            `
          )}
        </ha-list-box>
        <pre>
selected: ${JSON.stringify(this._toJson(this._multiCheckStart))}</pre
        >
      </ha-card>

      <ha-card
        header='Multi select, appearance=checkbox, selection-position="end"'
      >
        <ha-list-box
          multi
          aria-label="Multi checkbox end"
          @ha-list-selected=${this._onMultiCheckEnd}
        >
          ${this._options.map(
            (o, i) => html`
              <ha-list-item-option
                appearance="checkbox"
                selection-position="end"
                .value=${o}
                ?selected=${this._isSel(this._multiCheckEnd, i)}
              >
                <span slot="headline">${o}</span>
                <span slot="supporting-text">${o.length} characters</span>
              </ha-list-item-option>
            `
          )}
        </ha-list-box>
        <pre>
selected: ${JSON.stringify(this._toJson(this._multiCheckEnd))}</pre
        >
      </ha-card>

      <ha-card header="Option: all combinations">
        <div class="grid">
          ${appearances.map((appearance) =>
            positions.map((position) =>
              selectedStates.map((selected) =>
                disabledStates.map(
                  (disabled) => html`
                    <div role="listbox" class="wrap" aria-label="single option">
                      <ha-list-item-option
                        appearance=${appearance}
                        selection-position=${position}
                        ?selected=${selected}
                        ?disabled=${disabled}
                      >
                        <span slot="headline"
                          >${appearance} / pos=${position}</span
                        >
                        <span slot="supporting-text"
                          >selected=${String(selected)}
                          disabled=${String(disabled)}</span
                        >
                      </ha-list-item-option>
                    </div>
                  `
                )
              )
            )
          )}
        </div>
      </ha-card>

      <h2>ha-list-item-todo</h2>
      <p>
        Todo-shaped row. Use inside <code>ha-list-base</code> (role
        <code>list</code>), not <code>ha-list-box</code>.
      </p>

      <ha-card header="Todo list (checkbox-start)">
        <ha-list-base aria-label="Todos">
          ${this._todos.map(
            (todo) => html`
              <ha-list-item-todo
                .checked=${todo.checked}
                data-id=${todo.id}
                @item-toggle=${this._onTodoToggle}
                @item-click=${this._onTodoClick}
              >
                <span slot="headline">${todo.text}</span>
                <ha-svg-icon slot="end" .path=${mdiPencil}></ha-svg-icon>
              </ha-list-item-todo>
            `
          )}
        </ha-list-base>
        <pre>
item-toggle: ${this._lastToggle}
item-click:  ${this._lastClick}</pre
        >
      </ha-card>

      <ha-card header="Todo list (checkbox-end)">
        <ha-list-base aria-label="Todos checkbox-end">
          ${this._todos.map(
            (todo) => html`
              <ha-list-item-todo
                checkbox-end
                .checked=${todo.checked}
                data-id=${todo.id}
                @item-toggle=${this._onTodoToggle}
                @item-click=${this._onTodoClick}
              >
                <span slot="headline">${todo.text}</span>
              </ha-list-item-todo>
            `
          )}
        </ha-list-base>
      </ha-card>

      <h2>ha-list-nav</h2>
      <p>
        Same as <code>ha-list-base</code> but wrapped in a
        <code>&lt;nav&gt;</code> landmark.
      </p>

      <ha-card header="Sidebar-style navigation">
        <ha-list-nav aria-label="Primary navigation">
          ${[
            { name: "Overview", path: "#overview", icon: mdiHome },
            { name: "Dashboards", path: "#dashboards", icon: mdiViewDashboard },
            { name: "Map", path: "#map", icon: mdiMapMarker },
            { name: "Settings", path: "#settings", icon: mdiCog },
          ].map(
            (p) => html`
              <ha-list-item-button .href=${p.path}>
                <ha-svg-icon slot="start" .path=${p.icon}></ha-svg-icon>
                <span slot="headline">${p.name}</span>
                <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
              </ha-list-item-button>
            `
          )}
        </ha-list-nav>
      </ha-card>
    `;
  }

  private _isSel(value: number | Set<number>, index: number): boolean {
    if (typeof value === "number") {
      return value === index;
    }
    return value.has(index);
  }

  private _toJson(value: number | Set<number>): unknown {
    return value instanceof Set ? [...value] : value;
  }

  private _onButtonClick = () => {
    this._buttonClicks++;
  };

  private _onSingle = (ev: CustomEvent<HaListSelectedDetail>) => {
    this._single = ev.detail.index;
  };

  private _onMultiLine = (ev: CustomEvent<HaListSelectedDetail>) => {
    this._multiLine = ev.detail.index;
  };

  private _onMultiCheckStart = (ev: CustomEvent<HaListSelectedDetail>) => {
    this._multiCheckStart = ev.detail.index;
  };

  private _onMultiCheckEnd = (ev: CustomEvent<HaListSelectedDetail>) => {
    this._multiCheckEnd = ev.detail.index;
  };

  private _onTodoToggle = (ev: CustomEvent<{ checked: boolean }>) => {
    const id = (ev.currentTarget as HTMLElement).dataset.id!;
    this._todos = this._todos.map((t) =>
      t.id === id ? { ...t, checked: ev.detail.checked } : t
    );
    this._lastToggle = `${id} → ${ev.detail.checked}`;
  };

  private _onTodoClick = (ev: CustomEvent) => {
    const id = (ev.currentTarget as HTMLElement).dataset.id!;
    this._lastClick = id;
  };

  private _onMoved = (ev: CustomEvent) => {
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this._sortRows];
    const [item] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, item);
    this._sortRows = next;
    this._lastMove = `${oldIndex} → ${newIndex}`;
  };

  private _onHandleMoved = (ev: CustomEvent) => {
    const { oldIndex, newIndex } = ev.detail;
    const next = [...this._handleRows];
    const [item] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, item);
    this._handleRows = next;
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-4);
      padding: var(--ha-space-6);
    }
    h2 {
      margin: var(--ha-space-4) 0 0;
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-medium);
    }
    p {
      margin: 0 0 var(--ha-space-2);
      color: var(--secondary-text-color);
    }
    ha-card {
      max-width: 560px;
    }
    pre {
      padding: var(--ha-space-4);
      background: var(--secondary-background-color);
      margin: 0;
    }
    .custom-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-1);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--ha-space-3);
      padding: var(--ha-space-3);
    }
    .wrap {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-sm);
    }
    .drag-handle {
      cursor: grab;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-list": DemoHaList;
  }
}
