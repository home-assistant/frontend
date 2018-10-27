import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import { navigate } from "../common/navigate";

/*
 * @polymerMixin
 * @appliesMixin EventsMixin
 */
export default dedupingMixin(
  (superClass) =>
    class extends superClass {
      navigate(...args) {
        navigate(this, ...args);
      }
    }
);
