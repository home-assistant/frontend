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
import * as tslib_1 from "tslib";
import { MDCComponent } from "@material/base/component";
import { MDCCheckbox } from "@material/checkbox/component";
import { closest } from "@material/dom/ponyfill";
import { cssClasses, events, strings } from "./constants";
import { MDCDataTableFoundation } from "./foundation";
var MDCDataTable = /** @class */ (function(_super) {
  tslib_1.__extends(MDCDataTable, _super);
  function MDCDataTable() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  MDCDataTable.attachTo = function(root) {
    return new MDCDataTable(root);
  };
  MDCDataTable.prototype.initialize = function(checkboxFactory) {
    if (checkboxFactory === void 0) {
      checkboxFactory = function(el) {
        return new MDCCheckbox(el);
      };
    }
    this.checkboxFactory_ = checkboxFactory;
  };
  MDCDataTable.prototype.initialSyncWithDOM = function() {
    var _this = this;
    this.headerRow_ = this.root_.querySelector("." + cssClasses.HEADER_ROW);
    this.handleHeaderRowCheckboxChange_ = function() {
      return _this.foundation_.handleHeaderRowCheckboxChange();
    };
    this.headerRow_.addEventListener(
      "change",
      this.handleHeaderRowCheckboxChange_
    );
    this.content_ = this.root_.querySelector("." + cssClasses.CONTENT);
    this.handleRowCheckboxChange_ = function(event) {
      return _this.foundation_.handleRowCheckboxChange(event);
    };
    this.content_.addEventListener("change", this.handleRowCheckboxChange_);
    this.layout();
  };
  /**
   * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
   */
  MDCDataTable.prototype.layout = function() {
    this.foundation_.layout();
  };
  /**
   * @return Returns array of row elements.
   */
  MDCDataTable.prototype.getRows = function() {
    return this.foundation_.getRows();
  };
  /**
   * @return Returns array of selected row ids.
   */
  MDCDataTable.prototype.getSelectedRowIds = function() {
    return this.foundation_.getSelectedRowIds();
  };
  /**
   * Sets selected row ids. Overwrites previously selected rows.
   * @param rowIds Array of row ids that needs to be selected.
   */
  MDCDataTable.prototype.setSelectedRowIds = function(rowIds) {
    this.foundation_.setSelectedRowIds(rowIds);
  };
  MDCDataTable.prototype.destroy = function() {
    this.headerRow_.removeEventListener(
      "change",
      this.handleHeaderRowCheckboxChange_
    );
    this.content_.removeEventListener("change", this.handleRowCheckboxChange_);
    this.headerRowCheckbox_.destroy();
    this.rowCheckboxList_.forEach(function(checkbox) {
      return checkbox.destroy();
    });
  };
  MDCDataTable.prototype.getDefaultFoundation = function() {
    var _this = this;
    // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
    // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
    // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
    var adapter = {
      addClassAtRowIndex: function(rowIndex, className) {
        return _this.getRows()[rowIndex].classList.add(className);
      },
      getRowCount: function() {
        return _this.getRows().length;
      },
      getRowElements: function() {
        return [].slice.call(
          _this.root_.querySelectorAll(strings.ROW_SELECTOR)
        );
      },
      getRowIdAtIndex: function(rowIndex) {
        return _this.getRows()[rowIndex].getAttribute(strings.DATA_ROW_ID_ATTR);
      },
      getRowIndexByChildElement: function(el) {
        return _this.getRows().indexOf(closest(el, strings.ROW_SELECTOR));
      },
      getSelectedRowCount: function() {
        return _this.root_.querySelectorAll(strings.ROW_SELECTED_SELECTOR)
          .length;
      },
      isCheckboxAtRowIndexChecked: function(rowIndex) {
        return _this.rowCheckboxList_[rowIndex].checked;
      },
      isHeaderRowCheckboxChecked: function() {
        return _this.headerRowCheckbox_.checked;
      },
      isRowsSelectable: function() {
        return !!_this.root_.querySelector(strings.ROW_CHECKBOX_SELECTOR);
      },
      notifyRowSelectionChanged: function(data) {
        _this.emit(
          events.ROW_SELECTION_CHANGED,
          {
            row: _this.getRowByIndex_(data.rowIndex),
            rowId: _this.getRowIdByIndex_(data.rowIndex),
            rowIndex: data.rowIndex,
            selected: data.selected,
          },
          /** shouldBubble */ true
        );
      },
      notifySelectedAll: function() {
        return _this.emit(events.SELECTED_ALL, {}, /** shouldBubble */ true);
      },
      notifyUnselectedAll: function() {
        return _this.emit(events.UNSELECTED_ALL, {}, /** shouldBubble */ true);
      },
      registerHeaderRowCheckbox: function() {
        if (_this.headerRowCheckbox_) {
          _this.headerRowCheckbox_.destroy();
        }
        var checkboxEl = _this.root_.querySelector(
          strings.HEADER_ROW_CHECKBOX_SELECTOR
        );
        _this.headerRowCheckbox_ = _this.checkboxFactory_(checkboxEl);
      },
      registerRowCheckboxes: function() {
        if (_this.rowCheckboxList_) {
          _this.rowCheckboxList_.forEach(function(checkbox) {
            return checkbox.destroy();
          });
        }
        _this.rowCheckboxList_ = [];
        _this.getRows().forEach(function(rowEl) {
          var checkbox = _this.checkboxFactory_(
            rowEl.querySelector(strings.ROW_CHECKBOX_SELECTOR)
          );
          _this.rowCheckboxList_.push(checkbox);
        });
      },
      removeClassAtRowIndex: function(rowIndex, className) {
        _this.getRows()[rowIndex].classList.remove(className);
      },
      setAttributeAtRowIndex: function(rowIndex, attr, value) {
        _this.getRows()[rowIndex].setAttribute(attr, value);
      },
      setHeaderRowCheckboxChecked: function(checked) {
        _this.headerRowCheckbox_.checked = checked;
      },
      setHeaderRowCheckboxIndeterminate: function(indeterminate) {
        _this.headerRowCheckbox_.indeterminate = indeterminate;
      },
      setRowCheckboxCheckedAtIndex: function(rowIndex, checked) {
        _this.rowCheckboxList_[rowIndex].checked = checked;
      },
    };
    return new MDCDataTableFoundation(adapter);
  };
  MDCDataTable.prototype.getRowByIndex_ = function(index) {
    return this.getRows()[index];
  };
  MDCDataTable.prototype.getRowIdByIndex_ = function(index) {
    return this.getRowByIndex_(index).getAttribute(strings.DATA_ROW_ID_ATTR);
  };
  return MDCDataTable;
})(MDCComponent);
export { MDCDataTable };
//# sourceMappingURL=component.js.map
