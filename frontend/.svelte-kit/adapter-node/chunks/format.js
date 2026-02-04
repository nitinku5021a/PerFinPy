function formatInr(value) {
  if (value === null || value === void 0 || value === "") return "--";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const rounded = Math.round(num);
  return rounded.toLocaleString("en-IN");
}
export {
  formatInr as f
};
