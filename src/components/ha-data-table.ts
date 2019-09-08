import {
  MDCDataTableAdapter,
  MDCDataTableRowSelectionChangedEventDetail,
  MDCDataTableFoundation,
} from "@material/data-table";

import {
  BaseElement,
  html,
  query,
  queryAll,
  CSSResult,
  css,
  customElement,
  property,
  unsafeCSS,
  classMap,
} from "@material/mwc-base/base-element.js";

// tslint:disable-next-line
import style from "@material/data-table/dist/mdc.data-table.min.css";

import "./ha-checkbox";
// tslint:disable-next-line
import { HaCheckbox } from "./ha-checkbox";

export interface DataTabelHeaderData {
  name: string;
  type?: "numeric";
  sortable?: boolean;
  sort?: "desc" | "asc";
}

@customElement("ha-data-table")
export class HaDataTable extends BaseElement {
  @property({ type: Array }) public headers: DataTabelHeaderData[] = [];

  @property({ type: Array }) public data = [];

  @property({ type: Boolean }) public selectable = false;

  protected mdcFoundation!: MDCDataTableFoundation;

  protected readonly mdcFoundationClass = MDCDataTableFoundation;

  @query(".mdc-data-table") protected mdcRoot!: HTMLElement;

  @queryAll(".mdc-data-table__row") protected rowElements!: HTMLElement[];

  @query("#header-checkbox") private _headerCheckbox!: HaCheckbox;

  @property({ type: Boolean }) private _headerChecked = false;

  @property({ type: Boolean }) private _headerIndeterminate = false;

  @property({ type: Array }) private _checkedRows: number[] = [];

  protected render() {
    return html`
      <div class="mdc-data-table">
        <table class="mdc-data-table__table" aria-label="Dessert calories">
          <thead>
            <tr class="mdc-data-table__header-row">
              ${this.selectable
                ? html`
                    <th
                      class="mdc-data-table__header-cell mdc-data-table__header-cell--checkbox"
                      role="columnheader"
                      scope="col"
                    >
                      <ha-checkbox
                        id="header-checkbox"
                        class="mdc-data-table__row-checkbox"
                        @change=${this._handleHeaderRowCheckboxChange}
                        .indeterminate=${this._headerIndeterminate}
                        .checked=${this._headerChecked}
                      >
                      </ha-checkbox>
                    </th>
                  `
                : ""}
              ${this.headers.map(
                (header: DataTabelHeaderData) => html`
                  <th
                    class="mdc-data-table__header-cell ${classMap({
                      "mdc-data-table__cell--numeric": Boolean(
                        header.type && header.type === "numeric"
                      ),
                    })}"
                    role="columnheader"
                    scope="col"
                  >
                    ${header.name}
                  </th>
                `
              )}
            </tr>
          </thead>
          <tbody class="mdc-data-table__content">
            ${this.data.map(
              (row: [], idx) => html`
                <tr data-row-id="${idx}" class="mdc-data-table__row">
                  ${this.selectable
                    ? html`
                        <td
                          class="mdc-data-table__cell mdc-data-table__cell--checkbox"
                        >
                          <ha-checkbox
                            class="mdc-data-table__row-checkbox"
                            @change=${this._handleRowCheckboxChange}
                            .checked=${this._checkedRows.includes(idx)}
                          >
                          </ha-checkbox>
                        </td>
                      `
                    : ""}
                  ${row.map((cell: any, idxc: number) => {
                    const header = this.headers[idxc];
                    return html`
                      <td
                        class="mdc-data-table__cell ${classMap({
                          "mdc-data-table__cell--numeric": Boolean(
                            header.type && header.type === "numeric"
                          ),
                        })}"
                      >
                        ${cell}
                      </td>
                    `;
                  })}
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  protected createAdapter(): MDCDataTableAdapter {
    return {
      addClassAtRowIndex: (rowIndex: number, cssClasses: string) => {
        this.rowElements[rowIndex].classList.add(cssClasses);
      },
      getRowCount: () => this.data.length,
      getRowElements: () => this.rowElements,
      getRowIdAtIndex: (rowIndex: number) =>
        this.rowElements[rowIndex].getAttribute("data-row-id"),
      getRowIndexByChildElement: (el: Element) =>
        Array.prototype.indexOf.call(
          this.rowElements,
          el.parentElement!.parentElement!
        ),
      getSelectedRowCount: () => this._checkedRows.length,
      isCheckboxAtRowIndexChecked: (rowIndex: number) =>
        this._checkedRows.includes(rowIndex),
      isHeaderRowCheckboxChecked: () => this._headerChecked,
      isRowsSelectable: () => true,
      notifyRowSelectionChanged: (
        data: MDCDataTableRowSelectionChangedEventDetail
      ) => {},
      notifySelectedAll: () => {}, // void,
      notifyUnselectedAll: () => {}, //void,
      registerHeaderRowCheckbox: () => {}, //Promise<void> | void,
      registerRowCheckboxes: () => {}, //Promise<void> | void,
      removeClassAtRowIndex: (rowIndex: number, cssClasses: string) => {
        this.rowElements[rowIndex].classList.remove(cssClasses);
      },
      setAttributeAtRowIndex: (
        rowIndex: number,
        attr: string,
        value: string
      ) => {
        this.rowElements[rowIndex].setAttribute(attr, value);
      },
      setHeaderRowCheckboxChecked: (checked: boolean) => {
        this._headerChecked = checked;
      },
      setHeaderRowCheckboxIndeterminate: (indeterminate: boolean) => {
        this._headerIndeterminate = indeterminate;
      },
      setRowCheckboxCheckedAtIndex: (rowIndex: number, checked: boolean) => {
        this._setRowCheckboxCheckedAtIndex(rowIndex!, checked);
      },
    };
  }

  private _handleHeaderRowCheckboxChange() {
    this._headerChecked = this._headerCheckbox.checked;
    this._headerIndeterminate = this._headerCheckbox.indeterminate;
    this.mdcFoundation.handleHeaderRowCheckboxChange();
  }

  private _handleRowCheckboxChange(ev: Event) {
    const checkbox = ev.target as HaCheckbox;
    const rowIndex = Number(
      checkbox.parentElement!.parentElement!.getAttribute("data-row-id")
    );

    this._setRowCheckboxCheckedAtIndex(rowIndex!, checkbox.checked);
    this.mdcFoundation.handleRowCheckboxChange(ev);
  }

  private _setRowCheckboxCheckedAtIndex(rowIndex: number, checked: boolean) {
    if (checked && !this._checkedRows.includes(rowIndex)) {
      this._checkedRows = [...this._checkedRows, rowIndex];
    } else if (!checked) {
      const index = this._checkedRows.indexOf(rowIndex);
      if (index !== -1) {
        this._checkedRows.splice(index, 1);
      }
    }
  }

  static get styles(): CSSResult {
    return css`
      ${unsafeCSS(style)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table": HaDataTable;
  }
}
