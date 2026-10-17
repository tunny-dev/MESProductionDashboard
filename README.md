# MES Production Report

Bảng sản lượng và Andon cho nhà máy. Frontend React gọi REST API mới
(**MESProductionDashboardAPI**), tính toán và vẽ biểu đồ ở client.

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
- Truy cập được tới REST API mới (mặc định `http://localhost:5258/api`)

## Bắt đầu nhanh

```powershell
npm install

# Tạo env cá nhân từ template
Copy-Item .env.example .env.local
# Mở .env.local và trỏ VITE_API_BASE_URL tới host API thật

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
├── config/api.js           # ★ API_BASE_URL + ENDPOINTS (thêm endpoint ở đây)
├── lib/
│   ├── http.js             # ★ Axios dùng chung: baseURL + Bearer + bóc envelope
│   ├── api-params.js       # Chuẩn hoá ngày (ISO) + danh sách (mảng) cho payload
│   └── logger.js           # Logger theo level + requestId
└── features/
    ├── overview/           # Tổng quan: api, hooks, lib tính toán, components
    ├── production-dashboard/ # Dashboard xưởng: cascade + charts + station table
    ├── wip-report/         # WIP Report: summary + pivot trạm + drill-down SN
    └── auth/               # Login qua API mới
```

Chi tiết xem `docs/ARCHITECTURE.md`.

## Config môi trường

```text
VITE_API_BASE_URL     — URL gốc REST API mới (không trailing slash)
VITE_DEFAULT_FACTORY  — mã nhà máy cho GET /cim/getMfgType (mặc định 'VN')
VITE_LOG_LEVEL        — debug | info | warn | error | silent
```

Ví dụ `.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:5258/api
VITE_DEFAULT_FACTORY=VN
VITE_LOG_LEVEL=debug
```

## Gọi API

Mọi request đi qua `http` (`src/lib/http.js`). Client tự:
gắn `Authorization: Bearer <token>` từ auth store, bóc envelope
`{ success, message, data, errors, traceId }` → trả thẳng `data`, và ném lỗi
(`error.status`, `error.traceId`, `error.errors`) khi thất bại.

Khai endpoint ở `src/config/api.js` rồi gọi:

```js
import { http } from '@/lib/http';
import { ENDPOINTS } from '@/config/api';

// GET + query params
const lines = await http.get(ENDPOINTS.cim.productionLine, { params: { deptCode: 'H001' } });

// POST + JSON body (danh sách gửi dạng mảng, ngày dạng ISO yyyy-MM-dd)
const page = await http.post(ENDPOINTS.wip.summary, {
  mfgType: 'SMT',
  from: '2026-10-01',
  to: '2026-10-16',
  lines: ['D101'],
  page: 1,
  pageSize: 20,
});
// page = { items, total, page, pageSize, totalPages, from, to, hasPreviousPage, hasNextPage }
```

Nhóm endpoint hiện có (xem đầy đủ trong `ENDPOINTS`):

```text
POST /api/production/{getMoSummary,getWipReport,getProductionAchievement,getUphTrend,getFlowByMo,...}
POST /api/wip/{getWipSummary,getWipModels,getWipMos,getWipStation,getWipStationSn,getWipUnitSn,getWipNotInputSn}
GET  /api/mo/{getMoByLine,getMoInfo,getModelByLine}
GET  /api/cim/{getMfgType,getProductionAreaList,getProductionLine,getMfgByLine,getProductionShiftList,getProductionStopReasonList}
```

### Ghi chú về trang Tổng quan

API mới chưa cung cấp "snapshot" giàu như view cũ (mỗi line có scans/stops/
plannedUph). `getProductionSnapshot` hiện chỉ trả `{ totalInput, totalOutput }`.
Trang Tổng quan vì vậy chỉ hiển thị phần dữ liệu API mới có; `snapshot-view.js`
đã có guard để không crash khi thiếu `lines`.

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

Sửa công thức trong `production-calc.js` mà không chạy `verify-calc.mjs` thì dễ mang lỗi số liệu lên xưởng.

## Git hooks

Dùng Husky + lint-staged. Ai clone về chỉ cần `npm install` (script `prepare` tự gắn hook).

- `.husky/pre-commit` → `npx lint-staged`
- `lint-staged` trong `package.json`: `*.{js,jsx}` chạy `eslint --fix` + `prettier --write`

## Log và xử lý lỗi

- Log ra DevTools Console (`F12`), lọc `api:` để chỉ xem log HTTP.
- Mỗi request có `requestId` chung cho cặp request/response — đang gọi song song mà lỗi thì copy `error.requestId` vào ô Filter để tra.
- API trả envelope `{ success, message, data, errors, traceId }`: `http` ném lỗi kèm `error.status`, `error.traceId`, `error.errors`; mất mạng/timeout thì `error.status === 0`.
- 401/403 (ngoài request login) → tự đăng xuất + mở dialog phiên hết hạn.

Đổi level log không cần reload, chạy trong Console:

```js
import('@/lib/logger').then((m) => m.logger.setLevel('debug'));
```

## Deploy

- Dev (`npm run dev`): gọi thẳng API mới qua `VITE_API_BASE_URL` (API bật CORS AllowAnyOrigin) — không cần proxy.
- Production (IIS): build với `VITE_API_BASE_URL` là host API thật, hoặc để trống nếu deploy same-origin.
- `public/web.config` chỉ còn SPA fallback; không còn rewrite `/api/mes/auth`.
