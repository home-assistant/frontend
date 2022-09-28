export const titleCase = (s) =>
  s.replace(/^_*(.)|_+(.)/g, (_s, c, d) =>
    c ? c.toUpperCase() : " " + d.toUpperCase()
  );
