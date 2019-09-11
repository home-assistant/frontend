/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { MDCComponent } from "@material/base/component";
import { MDCCheckboxFactory } from "@material/checkbox/component";
import { MDCDataTableFoundation } from "./foundation";
export declare class MDCDataTable extends MDCComponent<MDCDataTableFoundation> {
  static attachTo(root: Element): MDCDataTable;
  private headerRowCheckbox_;
  private rowCheckboxList_;
  private checkboxFactory_;
  private headerRow_;
  private content_;
  private handleHeaderRowCheckboxChange_;
  private handleRowCheckboxChange_;
  initialize(checkboxFactory?: MDCCheckboxFactory): void;
  initialSyncWithDOM(): void;
  /**
   * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
   */
  layout(): void;
  /**
   * @return Returns array of row elements.
   */
  getRows(): Element[];
  /**
   * @return Returns array of selected row ids.
   */
  getSelectedRowIds(): Array<string | null>;
  /**
   * Sets selected row ids. Overwrites previously selected rows.
   * @param rowIds Array of row ids that needs to be selected.
   */
  setSelectedRowIds(rowIds: string[]): void;
  destroy(): void;
  getDefaultFoundation(): MDCDataTableFoundation;
  private getRowByIndex_;
  private getRowIdByIndex_;
}
