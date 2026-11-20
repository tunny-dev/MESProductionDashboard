import { useQuery } from '@tanstack/react-query';
import { getLineProductionBoard } from '@/services/production-board.service';

/**
 * Query Key Factory chuẩn hóa cho phân hệ Bảng sản xuất (Production Board).
 */
export const productionBoardKeys = {
  all: ['production-board'],
  board: (params) => [...productionBoardKeys.all, 'board', params],
};

export function useLineProductionBoard({ line, date, shift, mo, station } = {}, options = {}) {
  return useQuery({
    queryKey: productionBoardKeys.board({ line, date, shift, mo, station }),
    queryFn: () => getLineProductionBoard({ line, date, shift, mo, station }),
    enabled: Boolean(line),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    ...options,
  });
}
