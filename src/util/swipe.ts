import "hammerjs";

export const setupHorizontalSwipe = (
  backwardsCallback,
  forwardsCallback,
  element
) => {
  if (!element) return undefined;

  const mc = new Hammer.Manager(element, {
    touchAction: "auto",
    inputClass: Hammer.TouchMouseInput,
  });

  mc.add(
    new Hammer.Swipe({
      threshold: 120,
      velocity: 1,
      direction: Hammer.DIRECTION_HORIZONTAL,
    })
  );

  mc.on("swipeleft", forwardsCallback);
  mc.on("swiperight", backwardsCallback);

  return () => mc.destroy();
};
