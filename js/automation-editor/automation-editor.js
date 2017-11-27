import { h, render } from 'preact';
import Automation from './automation.js';
import Script from './script.js';

window.ScriptEditor = function (mountEl, props, mergeEl) {
  return render(h(Script, props), mountEl, mergeEl);
};

window.AutomationEditor = function (mountEl, props, mergeEl) {
  return render(h(Automation, props), mountEl, mergeEl);
};

window.unmountPreact = function (mountEl, mergeEl) {
  render(() => null, mountEl, mergeEl);
};
