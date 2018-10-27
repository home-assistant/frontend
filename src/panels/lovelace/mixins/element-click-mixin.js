import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { computeTooltip } from "../../../common/string/compute-tooltip";
import { handleClick } from "../../../common/dom/handle-click";

export default dedupingMixin(
  (superClass) =>
    class extends superClass {
      handleClick(...args) {
        handleClick(this, ...args);
      }

      computeTooltip(...args) {
        computeTooltip(...args);
      }
    }
);
