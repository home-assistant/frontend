export default function computeCardSize(element) {
  return typeof element.getCardSize === 'function' ? element.getCardSize() : 1;
}
