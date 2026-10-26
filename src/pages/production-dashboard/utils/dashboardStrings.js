const NS = 'productionDashboard';

export function getDashboardCopy(t) {
  const base = t(NS, { returnObjects: true });
  const copy = base && typeof base === 'object' ? base : {};

  const scopeBar = { ...copy.scopeBar };
  delete scopeBar.multiDayHint_one;
  delete scopeBar.multiDayHint_other;
  const woProgress = { ...copy.woProgress };
  delete woProgress.span_one;
  delete woProgress.span_other;

  return {
    ...copy,
    title: (type) => t(`${NS}.title`, { type }),
    subtitle: (type) => t(`${NS}.subtitle`, { type }),
    scopeBar: {
      ...scopeBar,
      multiDayHint: (days) => t(`${NS}.scopeBar.multiDayHint`, { days, count: days }),
    },
    woProgress: {
      ...woProgress,
      span: (from, to, days) => t(`${NS}.woProgress.span`, { from, to, days, count: days }),
      of: (done, plan) => t(`${NS}.woProgress.of`, { done, plan }),
    },
    woPicker: {
      ...copy.woPicker,
      showing: (from, to, total) => t(`${NS}.woPicker.showing`, { from, to, total }),
      page: (current, total) => t(`${NS}.woPicker.page`, { current, total }),
    },
    flow: {
      ...copy.flow,
      title: (type) => t(`${NS}.flow.title`, { type }),
    },
    charts: {
      ...copy.charts,
      uphTrend: (type) => t(`${NS}.charts.uphTrend`, { type }),
    },
  };
}
