import { HapticType } from "../data/haptics";

const hapticPatterns = {
  success: [50, 50, 50],
  warning: [100, 50, 100],
  failure: [200, 100, 200],
  light: [100],
  medium: [200],
  heavy: [300],
  selection: [50],
};

export const handleHaptic = (hapticType: HapticType) => {
  if (navigator.vibrate) {
    navigator.vibrate(hapticPatterns[hapticType]);
  }
};
