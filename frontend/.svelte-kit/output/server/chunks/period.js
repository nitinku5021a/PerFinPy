function toPeriodParam(period, startDate, endDate) {
  if (period !== "custom") return period;
  return "all";
}
export {
  toPeriodParam as t
};
