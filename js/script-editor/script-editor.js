import { h, render } from 'preact';
import Script from './script';

window.ScriptEditor = function (mountEl, props, mergeEl) {
  return render(h(Script, props), mountEl, mergeEl);
};

window.unmountPreact = function (mountEl, mergeEl) {
  render(() => null, mountEl, mergeEl);
};
