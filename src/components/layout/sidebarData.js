import { Factory, LayoutDashboard, MonitorPlay } from 'lucide-react';

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
          title: 'Bảng sản lượng chuyền',
          url: '/production-board',
          icon: MonitorPlay,
        },
      ],
    },
  ],
};
