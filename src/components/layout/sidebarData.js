import { BarChart3, ClipboardList, Factory, LayoutDashboard, Settings2 } from 'lucide-react';

export const sidebarData = {
  navGroups: [
    {
      title: 'Production & MES',
      items: [
        {
          title: 'Tổng quan (Overview)',
          url: '/overview',
          icon: LayoutDashboard,
        },
        {
          title: 'Dashboard sản xuất',
          url: '/production-dashboard',
          icon: Factory,
        },
        {
          title: 'Báo cáo WIP',
          url: '/wip-report',
          icon: ClipboardList,
        },
        {
          title: 'Biểu đồ sản xuất',
          url: '/overview/chart',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Maintain',
      items: [
        {
          title: 'Cycle Time',
          url: '/maintain/cim-cycle-time',
          icon: Settings2,
        },
      ],
    },
  ],
};
