export function formatInr(value) {
  if (value === null || value === undefined || value === "") return "--";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const rounded = Math.round(num);
  return rounded.toLocaleString("en-IN");
}
