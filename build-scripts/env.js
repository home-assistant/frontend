module.exports = {
  isProdBuild: process.env.NODE_ENV === "production",
  isStatsBuild: process.env.STATS === "1",
  isTravis: process.env.TRAVIS === "true",
  isNetlify: process.env.NETLIFY === "true",
};
