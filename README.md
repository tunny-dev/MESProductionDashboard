# MES Production Report

Bảng sản lượng và Andon cho nhà máy. Frontend React gọi dữ liệu thô từ hệ thống MES qua `invoke?sCode=...`, tính toán và vẽ biểu đồ ở client.

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
- Truy cập được tới server MES (mặc định `http://172.17.209.2`)

## Bắt đầu nhanh

```powershell
npm install

# Tạo env cá nhân từ template
Copy-Item .env.example .env.local
# Mở .env.local và điền URL MES thật

npm run dev      # chạy dev
npm run build    # build production -> dist/
npm run preview  # xem thử bản build
```

Quy ước env: `.env` chứa giá trị mặc định (được commit), `.env.local` override cá nhân (không commit).

## Route chính

| Route                                | Màn hình                                          |
| ------------------------------------ | ------------------------------------------------- |
| `/`                                  | Trang chủ                                         |
| `/overview`                          | Tổng quan sản xuất                                |
| `/overview/line/:lineId`             | Chi tiết line                                     |
| `/overview/chart`                    | Biểu đồ ngày                                      |
| `/production-dashboard`              | Dashboard xưởng (cascade công đoạn → chuyền → WO) |
| `/login`, `/forgot-password`, `/403` | Xác thực / phân quyền                             |

## Cấu trúc dự án

```text
src/
├── app/                    # Shell, router, providers
├── pages/                  # Một route = một file
├── config/api.js            # ★ MES_SYSTEMS + MES_S_CODES (thêm system/sCode ở đây)
├── lib/
│   ├── mes-http.js          # ★ Factory axios cho MES invoke
│   ├── unwrap-response.js   # Bóc mảng trần / envelope { data: [...] }
│   └── logger.js            # Logger theo level + requestId
├── server/mes-auth.js       # Proxy login MES (chỉ dùng ở dev, không bundle)
└── features/
    ├── overview/           # Tổng quan: api, hooks, lib tính toán, components
    └── production-dashboard/ # Dashboard xưởng: cascade + charts + station table
```

Chi tiết xem `docs/ARCHITECTURE.md`.

## Config môi trường

Mỗi hệ thống MES có đúng 2 biến:

```text
VITE_MES_<ID>_URL     — URL gốc server (không trailing slash)
VITE_MES_<ID>_INVOKE  — số invoke = datasource trên server đó
```

Ví dụ `.env.local`:

```dotenv
VITE_MES_SFCS_URL=http://172.17.209.2
VITE_MES_SFCS_INVOKE=6

# Mã nhà máy gửi trong P_DC003 của GET_MFG_TYPE
VITE_MES_FACTORY=VN

VITE_LOG_LEVEL=debug
MES_AUTH_URL=http://172.17.209.2/MES/auth
```

Giải thích `invokeN`: backend MES có nhiều datasource song song, `/MES/invoke6` → datasource thứ 6. `VITE_MES_SFCS_INVOKE=6` nghĩa là system `sfcs` mặc định gọi `/MES/invoke6?sCode=...`.

Danh mục công đoạn hiện dùng `GET_MFG_TYPE`:

```text
POST /MES/invoke6?sCode=GET_MFG_TYPE   body: { "P_DC003": "VN" }
→ [{ "MfgCode": "VN001", "MfgType": "SMT", "Factory": "VN" }, ...]
```

Chuẩn hoá ở `features/overview/api/stages.js` thành `[{ id: 'SMT', deptCode: 'VN001', factory: 'VN' }]` — `id` để hiển thị, `deptCode` làm payload `MD004` cho `GET_PRODUCTION_LINE`.

## Gọi API MES

```js
import { mesGet, mesPost } from '@/lib/mes-http';
import { MES_S_CODES } from '@/config/api';

// System mặc định là sfcs
const stages = await mesPost(MES_S_CODES.production.stages, { P_DC003: 'VN' });

// Chỉ định system
const lot = await mesGet(MES_S_CODES.wip.lotStatus, { P_LOT_ID: 'L001' }, 'wip');
```

Thêm system mới — chỉ sửa `src/config/api.js`, không sửa `mes-http.js`:

```js
// 1. Thêm vào MES_SYSTEMS
erp: {
  id: 'erp',
  baseUrl: import.meta.env.VITE_MES_ERP_URL || '',
  invokeN: Number(import.meta.env.VITE_MES_ERP_INVOKE ?? 3),
  label: 'ERP',
},
// 2. Thêm sCode vào MES_S_CODES + 2 biến VITE_MES_ERP_URL/_INVOKE vào env
```

Override `invokeN` cho một call lẻ (cùng server nhưng sCode nằm ở datasource khác):

```js
await mesGet(MES_S_CODES.wh.stock, { P_WH: 'WH01' }, 'sfcs', { invokeN: 7 });
```

Ưu tiên: `options.invokeN` > `MES_SYSTEMS[system].invokeN`.

## Scripts

| Lệnh                                   | Tác dụng                                             |
| -------------------------------------- | ---------------------------------------------------- |
| `npm run dev` / `build` / `preview`    | Dev / build / xem build                              |
| `npm run lint` / `lint:fix`            | ESLint kiểm tra / tự sửa                             |
| `npm run format` / `format:check`      | Prettier ghi / kiểm tra                              |
| `node scripts/verify-calc.mjs`         | 42 kiểm tra công thức (target, UPH, trạng thái line) |
| `node scripts/verify-auth.mjs`         | Kiểm tra cổng login (cần dev server)                 |
| `node scripts/verify-i18n-theme.mjs`   | Kiểm tra 3 ngôn ngữ + dark mode (cần dev server)     |
| `node scripts/verify-error-page.mjs`   | Kiểm tra trang lỗi route                             |
| `node scripts/verify-dashboard-ui.mjs` | Kiểm tra UI dashboard                                |

Sửa công thức trong `production-calc.js` mà không chạy `verify-calc.mjs` thì dễ mang lỗi số liệu lên xưởng.

## Git hooks

Dùng Husky + lint-staged. Ai clone về chỉ cần `npm install` (script `prepare` tự gắn hook).

- `.husky/pre-commit` → `npx lint-staged`
- `lint-staged` trong `package.json`: `*.{js,jsx}` chạy `eslint --fix` + `prettier --write`

## Log và xử lý lỗi

- Log ra DevTools Console (`F12`), lọc `mes:` để chỉ xem log MES.
- Mỗi request có `requestId` chung cho cặp request/response — đang gọi song song mà lỗi thì copy `error.requestId` vào ô Filter để tra.
- MES luôn trả HTTP 200, lỗi nằm trong body → `mes-http.js` tự phát hiện và throw `error.isMesBusinessError === true`; mất mạng/timeout thì `error.status === 0`.

Đổi level log không cần reload, chạy trong Console:

```js
import('@/lib/logger').then((m) => m.logger.setLevel('debug'));
```

## Deploy

- Dev (`npm run dev`): login qua middleware `mes-auth-dev` trong `vite.config.js` → `src/server/mes-auth.js` forward tới `MES_AUTH_URL`.
- Production (IIS): `public/web.config` rewrite `/api/mes/auth` thẳng tới MES qua ARR, file `mes-auth.js` không được dùng.
- Dữ liệu `invoke` không cần giấu credentials nên gọi trực tiếp từ browser bằng Bearer token sau login.
