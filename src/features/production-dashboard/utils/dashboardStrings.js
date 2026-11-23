const NS = 'productionDashboard';

export function getDashboardCopy(t) {
  const base = t(NS, { returnObjects: true });
  const copy = base && typeof base === 'object' ? base : {};

  return {
    ...copy,
    title: (type) => t(`${NS}.title`, { type }),
    subtitle: (type) => t(`${NS}.subtitle`, { type }),
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
