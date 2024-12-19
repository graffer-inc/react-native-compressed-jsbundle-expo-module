const withCompressedJsBundle = require("./plugin/withCompressedJsBundle");

module.exports = (config) => {
  return withCompressedJsBundle(config);
};
