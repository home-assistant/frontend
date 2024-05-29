// Source: https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNames
if (Element.prototype.getAttributeNames === undefined) {
  Element.prototype.getAttributeNames = function () {
    const attributes = this.attributes;
    const length = attributes.length;
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = attributes[i].name;
    }
    return result;
  };
}
