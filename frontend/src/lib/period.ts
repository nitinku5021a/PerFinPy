export function toPeriodParam(period, startDate, endDate) {
  if (period !== "custom") return period;
  if (!startDate || !endDate) return "all";
  const start = startDate.replaceAll("-", "");
  const end = endDate.replaceAll("-", "");
  return `custom_${start}_${end}`;
}
