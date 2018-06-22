import 'mdn-polyfills/Array.prototype.includes';
import 'unfetch/polyfill';
import 'regenerator-runtime/runtime';
import objAssign from 'es6-object-assign';

objAssign.polyfill();

if (Object.values === undefined) {
  Object.values = function(target) {
    return Object.keys(target).map(function(key) { return target[key]; });
  }
}
