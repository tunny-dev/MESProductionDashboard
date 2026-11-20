/**
 * @param {Array<{ id: string, name: string, shortName: string, qty: number|null, line: string|null }>} flowStations
 * @param {Array<{ stationId: string, opName: string, stationName: string, line: string|null }>} wipStations
 * @param {{ lineId: string, group?: string } | null} applied
 * @returns {{ id: string, name: string, type: string, group: string, models: [], modelProfiles: {}, stations: Array } | null}
 */
export function buildLineConfig(flowStations, wipStations, applied) {
  if (!applied?.lineId) return null;

  const wipById = new Map((wipStations ?? []).map((s) => [s.stationId, s]));
  const flowQty = new Map((flowStations ?? []).map((s) => [s.id, s.qty]));

  const stations = [];
  const seen = new Set();

  for (const flowStation of flowStations ?? []) {
    const wip = wipById.get(flowStation.id);
    // Trong ca: nếu có danh sách trạm quét trong ca (wipStations) thì chỉ giữ trạm có phát sinh trong wip
    if (wipStations && wipStations.length > 0 && !wip) {
      continue;
    }
    stations.push(
      wip
        ? {
            id: wip.stationId,
            name: wip.opName || wip.stationName || wip.stationId,
            shortName: wip.opName || wip.stationName || wip.stationId,
            qty: flowQty.get(flowStation.id) ?? null,
            line: wip.line ?? null,
          }
        : {
            id: flowStation.id,
            name: flowStation.name,
            shortName: flowStation.shortName,
            qty: flowStation.qty ?? null,
            line: flowStation.line ?? null,
          }
    );
    seen.add(flowStation.id);
  }

  // Trạm có wip nhưng không có trong flow (flow chưa tải xong).
  for (const wipStation of wipStations ?? []) {
    if (seen.has(wipStation.stationId)) continue;
    stations.push({
      id: wipStation.stationId,
      name: wipStation.opName || wipStation.stationName || wipStation.stationId,
      shortName: wipStation.opName || wipStation.stationName || wipStation.stationId,
      qty: flowQty.get(wipStation.stationId) ?? null,
      line: wipStation.line ?? null,
    });
    seen.add(wipStation.stationId);
  }

  if (stations.length === 0) return null;

  return {
    id: applied.lineId,
    name: applied.lineId,
    type: applied.group ?? '',
    group: applied.group ?? '',
    models: [],
    modelProfiles: {},
    stations,
  };
}
