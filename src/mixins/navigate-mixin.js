import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import EventsMixin from './events-mixin';

/* @polymerMixin */
export default dedupingMixin(superClass =>
  class extends EventsMixin(superClass) {
    navigate(path, replace = false) {
      if (replace) {
        history.replaceState(null, null, path);
      } else {
        history.pushState(null, null, path);
      }
      this.fire('location-changed');
    }
  });
