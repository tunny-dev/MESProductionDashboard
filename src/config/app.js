export const APP_TITLE = 'MES Production Dashboard';
export const APP_SUBTITLE = 'Bảng sản lượng và Andon';

export const OVERVIEW_ALLOWED_USER_IDS = ['K00136', 'admin'];

export function canAccessOverview(user) {
  const id = user?.id != null ? String(user.id).toUpperCase() : '';
  return OVERVIEW_ALLOWED_USER_IDS.some((allowed) => allowed.toUpperCase() === id);
}
