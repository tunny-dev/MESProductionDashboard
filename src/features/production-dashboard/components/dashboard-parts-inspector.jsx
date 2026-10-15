/**
 * Màn debug (?debug=1): soi request/response thô của từng nguồn dashboard.
 * Chỉ dùng khi rà soát sCode — không hiện ở màn thường.
 */

const STATUS_STYLE = {
  idle: 'bg-neutral-bg text-neutral-text',
  loading: 'bg-warning-bg text-warning-text',
  success: 'bg-success-bg text-success-text',
  error: 'bg-danger-bg text-danger-text',
};

const STATUS_LABEL = {
  idle: 'chưa chạy',
  loading: 'đang tải',
  success: 'ok',
  error: 'lỗi',
};

export function DashboardPartsInspector({ parts = [] }) {
  if (!Array.isArray(parts) || parts.length === 0) return null;

  return (
    <section className="rounded-md border border-solid border-border bg-surface p-3">
      <p className="text-sm font-semibold">
        Debug từng nguồn <span className="font-normal text-muted-foreground">(?debug=1)</span>
      </p>
      <div className="mt-2 grid gap-2">
        {parts.map((part) => (
          <details
            key={part.key}
            className="rounded-md border border-solid border-border"
            open={part.status === 'error'}
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span
                className={`rounded-sm px-1.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[part.status] ?? STATUS_STYLE.idle}`}
              >
                {STATUS_LABEL[part.status] ?? part.status}
                {part.isFetching ? '…' : ''}
              </span>
              <span className="font-semibold">{part.label}</span>
              <code className="text-xs text-muted-foreground">{part.sCode}</code>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {part.rowCount} rows · {part.columns.length} cols
              </span>
            </summary>
            <div className="grid gap-2 border-t border-solid border-border px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Params gửi đi</p>
                <pre className="mt-1 overflow-x-auto rounded-sm bg-muted p-2 text-xs tabular-nums">
                  {JSON.stringify(part.params, null, 2)}
                </pre>
              </div>
              {part.errorMessage ? (
                <p className="text-xs text-danger-text">Lỗi: {part.errorMessage}</p>
              ) : null}
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Cột trả về
                  {part.columns.length > 0 ? ` (${part.columns.join(', ')})` : ' — chưa có dữ liệu'}
                </p>
                {part.previewRows.length > 0 ? (
                  <pre className="mt-1 max-h-64 overflow-auto rounded-sm bg-muted p-2 text-xs tabular-nums">
                    {JSON.stringify(part.previewRows, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
