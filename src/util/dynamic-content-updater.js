import Polymer from '../polymer';

export default function dynamicContentUpdater(root, newElementTag, attributes) {
  const rootEl = Polymer.dom(root);

  let customEl;

  if (rootEl.lastChild && rootEl.lastChild.tagName === newElementTag) {
    customEl = rootEl.lastChild;
  } else {
    if (rootEl.lastChild) {
      rootEl.removeChild(rootEl.lastChild);
    }
    customEl = document.createElement(newElementTag);
  }

  Object.keys(attributes).forEach(key => customEl[key] = attributes[key]);

  if (customEl.parentNode === null) {
    rootEl.appendChild(customEl);
  }
}
