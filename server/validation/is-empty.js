const isEmpty = value =>
  !value ||
  (typeof value === "object" && !Object.keys(value).length) ||
  (typeof value === "string" && !value.trim().length);

module.exports = isEmpty;