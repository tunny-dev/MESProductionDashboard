# MES Production Report

Bảng sản lượng và Andon cho nhà máy. Frontend React gọi **MES StoreProcedure API** (`POST /MES/invoke6?sCode=...`), tính toán và vẽ biểu đồ ở client.

Mọi truy vấn đi qua một cửa duy nhất: `sCode` là khoá trong bảng `SERVICE_SQL` của DB `SFIS`, trỏ tới một stored procedure (`sql_service = 'stpquery'`) hoặc một câu SQL thô (`sql_service = 'query'`). Payload JSON gửi lên có key **camelCase trùng đúng tên tham số** của SP — xem `db/mes-invoke6-procedures.sql`.

## Tech stack

| Nhóm       | Công nghệ                                                    |
| ---------- | ------------------------------------------------------------ |
| Core       | React 19, Vite 8, React Router 7                             |
| Data       | TanStack Query 5, Axios, Zustand                             |
| UI         | Tailwind CSS 4, shadcn / Base UI, Lucide, Recharts, date-fns |
| i18n       | i18next — `vi` / `en` / `zh`                                 |
| Chất lượng | ESLint, Prettier, Husky + lint-staged                        |

## Yêu cầu

- Node.js 20+ (khuyên dùng bản LTS mới nhất)
- Truy cập được tới máy MES (`http://localhost:8080`) — browser gọi thẳng
- Máy MES bật CORS cho origin của FE (endpoint `/MES/auth` và `/MES/invoke6`)
- Tài khoản MES (`POST /MES/auth`) để lấy Bearer token

## Bắt đầu nhanh

```powershell
npm install

# Tạo env cá nhân từ template
Copy-Item .env.example .env.local
# Mở .env.local và sửa VITE_MES_URL nếu máy MES không ở localhost:8080

npm run dev      # chạy dev
npm run build    # build production -> dist/
npm run preview  # xem thử bản build
```

Quy ước env: `.env` chứa giá trị mặc định (được commit), `.env.local` override cá nhân (không commit).

## Route chính

| Route                                | Màn hình                                           |
| ------------------------------------ | -------------------------------------------------- |
| `/`                                  | Trang chủ                                          |
| `/overview`                          | Tổng quan sản xuất                                 |
| `/overview/line/:lineId`             | Chi tiết line                                      |
| `/overview/chart`                    | Biểu đồ ngày                                       |
| `/production-dashboard`              | Dashboard xưởng (cascade công đoạn → chuyền → WO)  |
| `/wip-report`                        | WIP Report (Query / Summary / Unit S/N / Stations) |
| `/login`, `/forgot-password`, `/403` | Xác thực / phân quyền                              |

## Cấu trúc dự án

```text
src/
├── app/                    # Shell, router, providers
├── pages/                  # Một route = một file
├── config/
│   ├── api.js              # ★ MES_SYSTEMS + MES_S_CODES + mesInvokeUrl (thêm sCode ở đây)
│   └── mes-codes.js        # Bảng tra mã UI → mã SQL (SHIFT_CODES)
├── lib/
│   ├── mes-http.js         # ★ Axios gọi invoke6: baseURL + Bearer + bóc lỗi MES
│   │                       #   + mesRows()/mesRow() — đã unwrap sẵn
│   ├── http.js             # Axios cho /MES/auth (đăng nhập)
│   ├── unwrap-response.js  # unwrapList / unwrapObject
│   ├── coerce.js           # toNum / toInt / toText — ép kiểu dữ liệu MES
│   ├── date.js             # toCompactDate / toCompactDateOr (yyyyMMdd)
│   └── logger.js           # Logger theo level + requestId
└── features/
    ├── overview/           # Tổng quan: api, hooks, lib tính toán, components
    ├── production-dashboard/ # Dashboard xưởng: cascade + charts + station table
    ├── wip-report/         # WIP Report: summary + pivot trạm + drill-down SN
    └── auth/               # Login qua MES auth
```

Chi tiết xem `docs/ARCHITECTURE.md`.

## Config môi trường

```text
VITE_MES_URL          — URL gốc máy MES, browser gọi thẳng (vd http://localhost:8080)
                        để TRỐNG = same-origin (khi đã có reverse proxy forward /MES)
VITE_MES_INVOKE       — số invokeN (mặc định 6)
VITE_DEFAULT_FACTORY  — mã nhà máy gửi trong `factory` (mặc định 'VN')
VITE_LOG_LEVEL        — debug | info | warn | error | silent

MES_PROXY_TARGET      — (server-only) đích proxy /MES lúc dev; chỉ dùng khi
                        VITE_MES_URL để TRỐNG
```

Ví dụ `.env.local`:

```dotenv
VITE_MES_URL=http://localhost:8080
VITE_MES_INVOKE=6
VITE_DEFAULT_FACTORY=VN
VITE_LOG_LEVEL=debug

MES_PROXY_TARGET=http://localhost:8080
```

## Gọi API

Mọi request đi qua `mesPost(sCode, body)` (`src/lib/mes-http.js`). Client tự:
gắn `Authorization: Bearer <token>` từ auth store, gọi
`POST {VITE_MES_URL}/MES/invoke6?sCode=<sCode>` với body JSON, và ném lỗi khi MES
trả lỗi nghiệp vụ (MES luôn trả HTTP 200, lỗi nằm trong body dạng
`[{ result: '@NG-@...' }]`).

Khai sCode ở `src/config/api.js` rồi gọi. Dùng `mesRows` cho sCode trả **danh
sách** và `mesRow` cho sCode trả **đúng 1 dòng** — hai hàm này đã `unwrapList` /
`unwrapObject` sẵn:

```js
import { mesRows, mesRow } from '@/lib/mes-http';
import { MES_S_CODES } from '@/config/api';

// POST + JSON body. Key camelCase = tên tham số SP.
const rows = await mesRows(MES_S_CODES.wipReport.getWipModels, {
  mfgType: 'VN001',
  from: '20261001',
  to: '20261016',
  lines: 'D101',
});

const summary = await mesRow(MES_S_CODES.mo.getMoInfo, { mo: 'VI2-2690631S' });
```

Nhóm sCode hiện có:

```text
stpquery  getMoSummary, getWipReport, getProductionAchievement, getUphTrend, getFlowByMo,
          getProductionLineDetail, getWipSummary, getWipModels, getWipMos, getWipStation,
          getWipStationSn, getWipUnitSn, getWipNotInputSn
query     getMfgType, getProductionAreaList, getProductionLine, getMfgByLine,
          getProductionShiftList, getProductionStopReasonList, getMoByLine, getMoInfo,
          getModelByLine, getProductionSnapshot
```

### Gọi sang hệ thống MES khác

`MES_SYSTEMS` (`src/config/api.js`) khai từng hệ thống với `baseUrl` riêng; truyền
`systemId` khi gọi: `mesPost(sCode, body, 'wip')`. Thêm hệ thống mới chỉ cần thêm
một mục vào `MES_SYSTEMS` + biến `VITE_*_URL`.

### Ghi chú hiệu năng (DB)

`SSFTA` là HEAP, chỉ có PK trên `(TA001, TA002, TA003)`. Mọi truy vấn lọc theo
`TA005` (MO) / `TA008` (chuyền) / `TA003` (ngày) đều phải quét toàn bảng. Script
`db/mes-invoke6-procedures.sql` có sẵn 2 index khuyến nghị ở cuối file.

## Scripts

| Lệnh                                   | Tác dụng                                             |
| -------------------------------------- | ---------------------------------------------------- |
| `npm run dev` / `build` / `preview`    | Dev / build / xem build                              |
| `npm run lint` / `lint:fix`            | ESLint kiểm tra / tự sửa                             |
| `npm run format` / `format:check`      | Prettier ghi / kiểm tra                              |
| `node scripts/verify-calc.mjs`         | 42 kiểm tra công thức (target, UPH, trạng thái line) |
| `node scripts/verify-i18n-theme.mjs`   | Kiểm tra 3 ngôn ngữ + dark mode (cần dev server)     |
| `node scripts/verify-error-page.mjs`   | Kiểm tra trang lỗi route                             |
| `node scripts/verify-dashboard-ui.mjs` | Kiểm tra UI dashboard                                |

## Deploy

- Browser gọi thẳng máy MES qua `VITE_MES_URL` → máy MES phải cho phép CORS cho origin của FE.
- Nếu không muốn mở CORS: để `VITE_MES_URL` trống rồi cho reverse proxy (IIS ARR) forward `/MES` sang máy MES khi build production. Lúc dev, Vite dev server cũng proxy `/MES` → `MES_PROXY_TARGET` cho trường hợp này.
- `public/web.config` chỉ còn SPA fallback.
