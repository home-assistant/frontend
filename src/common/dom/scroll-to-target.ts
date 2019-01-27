/**
 * Scroll to a specific y coordinate.
 *
 * Copied from paper-scroll-header-panel.
 *
 * @method scroll
 * @param {number} top The coordinate to scroll to, along the y-axis.
 * @param {boolean} smooth true if the scroll position should be smoothly adjusted.
 */
export default function scrollToTarget(element, target) {
  // the scroll event will trigger _updateScrollState directly,
  // However, _updateScrollState relies on the previous `scrollTop` to update the states.
  // Calling _updateScrollState will ensure that the states are synced correctly.
  var top = 0;
  var scroller = target;
  var easingFn = function easeOutQuad(t, b, c, d) {
    /* eslint-disable no-param-reassign, space-infix-ops, no-mixed-operators */
    t /= d;
    return -c * t * (t - 2) + b;
    /* eslint-enable no-param-reassign, space-infix-ops, no-mixed-operators */
  };
  var animationId = Math.random();
  var duration = 200;
  var startTime = Date.now();
  var currentScrollTop = scroller.scrollTop;
  var deltaScrollTop = top - currentScrollTop;
  element._currentAnimationId = animationId;
  (function updateFrame() {
    var now = Date.now();
    var elapsedTime = now - startTime;
    if (elapsedTime > duration) {
      scroller.scrollTop = top;
    } else if (element._currentAnimationId === animationId) {
      scroller.scrollTop = easingFn(
        elapsedTime,
        currentScrollTop,
        deltaScrollTop,
        duration
      );
      requestAnimationFrame(updateFrame.bind(element));
    }
  }.call(element));
}
