/**
 * Danh sách trạm FIX CỨNG theo công đoạn — cột trạm của trang /wip-report.
 *
 * Sinh từ DB ngày 15/10/2026 (trạm có log từ 01/08, OP sản xuất
 * `MA009 NOT IN ('4','5')`):
 *   SMT  7 trạm · DIP 11 trạm · FA 29 trạm.
 *
 * Mapping khi query: theo MÃ TRẠM (code), không theo model — model 10 trạm
 * hay 13 trạm thì đều fill vào đúng cột của nó, cột nào MO không đi qua
 * hiện '—'. Thứ tự trong mảng chỉ là thứ tự hiển thị, không ảnh hưởng mapping.
 *
 * KHI CÓ TRẠM MỚI: thêm 1 dòng vào mảng tương ứng rồi deploy FE, không cần
 * đụng SQL (API trả theo mã trạm, FE tự map). Muốn lấy lại danh sách từ DB:
 *   SELECT T.TA007, MAX(M.MA015) FROM SSFTA T
 *   LEFT JOIN SSFMA M ON M.MA001 = T.TA007
 *   WHERE T.TA003 >= '<YYYYMMDD>' AND T.TA007 IN
 *     (SELECT MA001 FROM SSFMA WHERE MA009 NOT IN('4','5') AND MA005='<H001|H002|H003>')
 *   GROUP BY T.TA007 ORDER BY T.TA007
 */
export const WIP_STATIONS_BY_PROCESS = {
  SMT: [
    { code: 'SMT04', name: 'SMT bottom parts control' },
    { code: 'SI08', name: 'AOI inspection(bottom)' },
    { code: 'SMT05', name: 'SMT top parts control' },
    { code: 'SI07', name: 'AOI inspection + combine' },
    { code: 'SX01', name: 'X-RAY' },
    { code: 'SX06', name: 'X-RAY' },
    { code: 'SMT06', name: 'SMT Completed Quantity' },
  ],
  DIP: [
    { code: 'CUT01', name: 'Cut PCB' },
    { code: 'DIP01', name: 'DIP key parts control' },
    { code: 'MI08', name: 'DIP inspection(front)' },
    { code: 'MI09', name: 'DIP inspection(back)' },
    { code: 'MI10', name: 'DIP inspection and MT combine' },
    { code: 'MI11', name: 'DIP inspection' },
    { code: 'MI13', name: 'DIP AOI' },
    { code: 'MT20', name: 'F/W Update' },
    { code: 'MT21', name: 'PCBA Test' },
    { code: 'MT30', name: 'Power Calibration 2.4G+5G' },
    { code: 'MT31', name: 'Power Calibration 2.4G+5G' },
  ],
  FA: [
    { code: 'AA01', name: 'Assembly' },
    { code: 'AA06', name: 'Assembly' },
    { code: 'AT06', name: 'F/W update' },
    { code: 'AT28', name: 'Burn-In test' },
    { code: 'AT39', name: 'Power Check' },
    { code: 'AT43', name: 'Safety Test' },
    { code: 'AT51', name: 'HiPot test' },
    { code: 'AT63', name: 'System Test' },
    { code: 'AT64', name: 'Final Test' },
    { code: 'AT72', name: 'Check Web' },
    { code: 'AT74', name: 'Lens Focus' },
    { code: 'AT77', name: 'Power Load' },
    { code: 'AT81', name: 'Power Calibration 2.4G+5G' },
    { code: 'AT82', name: 'Throughput test 2.4G' },
    { code: 'AT84', name: 'Throughput test 2.4G+5G' },
    { code: 'AT96', name: 'Write MAC(Testing)' },
    { code: 'AT132', name: 'Throughput test 6G' },
    { code: 'AS07', name: 'Write MAC(Combine)' },
    { code: 'AP04', name: 'Packing' },
    { code: 'AP07', name: 'Packing' },
    { code: 'AP08', name: 'Serial number combine' },
    { code: 'AP11', name: 'Check key parts' },
    { code: 'AP12', name: 'Packing' },
    { code: 'AP13', name: 'Pallet' },
    { code: 'AP15', name: 'weight' },
    { code: 'AP25', name: 'Check key parts(Testing)' },
    { code: 'AP26', name: 'Check key parts(Combine)' },
    { code: 'AP35', name: 'Check key partsII' },
    { code: 'MT24', name: 'POE test' },
  ],
};

/** Trạm của công đoạn đang chọn — không có thì null để FE lùi về pivot động. */
export function getProcessStations(mfgType) {
  const list = WIP_STATIONS_BY_PROCESS[mfgType];
  return Array.isArray(list) && list.length > 0 ? list : null;
}
