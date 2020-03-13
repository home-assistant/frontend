module.exports = {
  isProdBuild() {
    return process.env.NODE_ENV === "production";
  },
  isStatsBuild() {
    return process.env.STATS === "1";
  },
  isTravis() {
    return process.env.TRAVIS === "true";
  },
  isNetlify() {
    return process.env.NETLIFY === "true";
  },
};
