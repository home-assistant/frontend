import { h, render } from 'preact';
import Automation from './automation';

window.AutomationEditor = function (mountEl, props, mergeEl) {
  return render(h(Automation, props), mountEl, mergeEl);
};

window.unmountPreact = function (mountEl, mergeEl) {
  render(() => null, mountEl, mergeEl);
};
