import "hammerjs";

export const setupHorizontalSwipe = (backwardsCallback, forwardsCallback) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!isMobile) return () => {};

  const mc = new Hammer.Manager(document.body);
  mc.add(
    new Hammer.Swipe({
      threshold: 120,
      velocity: 1,
    })
  );

  mc.on("swipeleft", forwardsCallback);
  mc.on("swiperight", backwardsCallback);

  // Hammer.Swipe intercepts all touch events and prevents scrolls
  // So we add it back with this line
  document.body.style.touchAction = "pan-y";

  return () => mc.destroy();
};
