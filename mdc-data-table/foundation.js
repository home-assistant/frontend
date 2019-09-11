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
import { MDCFoundation } from "@material/base/foundation";
import { cssClasses, strings } from "./constants";
var MDCDataTableFoundation = /** @class */ (function(_super) {
  tslib_1.__extends(MDCDataTableFoundation, _super);
  function MDCDataTableFoundation(adapter) {
    return (
      _super.call(
        this,
        tslib_1.__assign({}, MDCDataTableFoundation.defaultAdapter, adapter)
      ) || this
    );
  }
  Object.defineProperty(MDCDataTableFoundation, "defaultAdapter", {
    get: function() {
      return {
        addClassAtRowIndex: function() {
          return undefined;
        },
        getRowCount: function() {
          return 0;
        },
        getRowElements: function() {
          return [];
        },
        getRowIdAtIndex: function() {
          return "";
        },
        getRowIndexByChildElement: function() {
          return 0;
        },
        getSelectedRowCount: function() {
          return 0;
        },
        isCheckboxAtRowIndexChecked: function() {
          return false;
        },
        isHeaderRowCheckboxChecked: function() {
          return false;
        },
        isRowsSelectable: function() {
          return false;
        },
        notifyRowSelectionChanged: function() {
          return undefined;
        },
        notifySelectedAll: function() {
          return undefined;
        },
        notifyUnselectedAll: function() {
          return undefined;
        },
        registerHeaderRowCheckbox: function() {
          return undefined;
        },
        registerRowCheckboxes: function() {
          return undefined;
        },
        removeClassAtRowIndex: function() {
          return undefined;
        },
        setAttributeAtRowIndex: function() {
          return undefined;
        },
        setHeaderRowCheckboxChecked: function() {
          return undefined;
        },
        setHeaderRowCheckboxIndeterminate: function() {
          return undefined;
        },
        setRowCheckboxCheckedAtIndex: function() {
          return undefined;
        },
      };
    },
    enumerable: true,
    configurable: true,
  });
  /**
   * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
   * Use this if registering checkbox is synchronous.
   */
  MDCDataTableFoundation.prototype.layout = function() {
    if (this.adapter_.isRowsSelectable()) {
      this.adapter_.registerHeaderRowCheckbox();
      this.adapter_.registerRowCheckboxes();
      this.setHeaderRowCheckboxState_();
    }
  };
  /**
   * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
   * Use this if registering checkbox is asynchronous.
   */
  MDCDataTableFoundation.prototype.layoutAsync = function() {
    return tslib_1.__awaiter(this, void 0, void 0, function() {
      return tslib_1.__generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (!this.adapter_.isRowsSelectable()) return [3 /*break*/, 3];
            return [4 /*yield*/, this.adapter_.registerHeaderRowCheckbox()];
          case 1:
            _a.sent();
            return [4 /*yield*/, this.adapter_.registerRowCheckboxes()];
          case 2:
            _a.sent();
            this.setHeaderRowCheckboxState_();
            _a.label = 3;
          case 3:
            return [2 /*return*/];
        }
      });
    });
  };
  /**
   * @return Returns array of row elements.
   */
  MDCDataTableFoundation.prototype.getRows = function() {
    return this.adapter_.getRowElements();
  };
  /**
   * Sets selected row ids. Overwrites previously selected rows.
   * @param rowIds Array of row ids that needs to be selected.
   */
  MDCDataTableFoundation.prototype.setSelectedRowIds = function(rowIds) {
    for (var rowIndex = 0; rowIndex < this.adapter_.getRowCount(); rowIndex++) {
      var rowId = this.adapter_.getRowIdAtIndex(rowIndex);
      var isSelected = false;
      if (rowId && rowIds.indexOf(rowId) >= 0) {
        isSelected = true;
      }
      this.adapter_.setRowCheckboxCheckedAtIndex(rowIndex, isSelected);
      this.selectRowAtIndex_(rowIndex, isSelected);
    }
    this.setHeaderRowCheckboxState_();
  };
  /**
   * @return Returns array of selected row ids.
   */
  MDCDataTableFoundation.prototype.getSelectedRowIds = function() {
    var selectedRowIds = [];
    for (var rowIndex = 0; rowIndex < this.adapter_.getRowCount(); rowIndex++) {
      if (this.adapter_.isCheckboxAtRowIndexChecked(rowIndex)) {
        selectedRowIds.push(this.adapter_.getRowIdAtIndex(rowIndex));
      }
    }
    return selectedRowIds;
  };
  /**
   * Handles header row checkbox change event.
   */
  MDCDataTableFoundation.prototype.handleHeaderRowCheckboxChange = function() {
    var isHeaderChecked = this.adapter_.isHeaderRowCheckboxChecked();
    for (var rowIndex = 0; rowIndex < this.adapter_.getRowCount(); rowIndex++) {
      this.adapter_.setRowCheckboxCheckedAtIndex(rowIndex, isHeaderChecked);
      this.selectRowAtIndex_(rowIndex, isHeaderChecked);
    }
    if (isHeaderChecked) {
      this.adapter_.notifySelectedAll();
    } else {
      this.adapter_.notifyUnselectedAll();
    }
  };
  /**
   * Handles change event originated from row checkboxes.
   */
  MDCDataTableFoundation.prototype.handleRowCheckboxChange = function(event) {
    var rowIndex = this.adapter_.getRowIndexByChildElement(event.target);
    if (rowIndex === -1) {
      return;
    }
    var selected = this.adapter_.isCheckboxAtRowIndexChecked(rowIndex);
    this.selectRowAtIndex_(rowIndex, selected);
    this.setHeaderRowCheckboxState_();
    var rowId = this.adapter_.getRowIdAtIndex(rowIndex);
    this.adapter_.notifyRowSelectionChanged({
      rowId: rowId,
      rowIndex: rowIndex,
      selected: selected,
    });
  };
  /**
   * Updates header row checkbox state based on number of rows selected.
   */
  MDCDataTableFoundation.prototype.setHeaderRowCheckboxState_ = function() {
    if (this.adapter_.getSelectedRowCount() === this.adapter_.getRowCount()) {
      this.adapter_.setHeaderRowCheckboxChecked(true);
      this.adapter_.setHeaderRowCheckboxIndeterminate(false);
    } else if (this.adapter_.getSelectedRowCount() === 0) {
      this.adapter_.setHeaderRowCheckboxIndeterminate(false);
      this.adapter_.setHeaderRowCheckboxChecked(false);
    } else {
      this.adapter_.setHeaderRowCheckboxIndeterminate(true);
      this.adapter_.setHeaderRowCheckboxChecked(false);
    }
  };
  /**
   * Sets the attributes of row element based on selection state.
   */
  MDCDataTableFoundation.prototype.selectRowAtIndex_ = function(
    rowIndex,
    selected
  ) {
    if (selected) {
      this.adapter_.addClassAtRowIndex(rowIndex, cssClasses.ROW_SELECTED);
      this.adapter_.setAttributeAtRowIndex(
        rowIndex,
        strings.ARIA_SELECTED,
        "true"
      );
    } else {
      this.adapter_.removeClassAtRowIndex(rowIndex, cssClasses.ROW_SELECTED);
      this.adapter_.setAttributeAtRowIndex(
        rowIndex,
        strings.ARIA_SELECTED,
        "false"
      );
    }
  };
  return MDCDataTableFoundation;
})(MDCFoundation);
export { MDCDataTableFoundation };
//# sourceMappingURL=foundation.js.map
