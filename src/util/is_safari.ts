export const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent
);

export const isSafari14 = /^((?!chrome|android).)*version\/14\.0\s.*safari/i.test(
  navigator.userAgent
);
