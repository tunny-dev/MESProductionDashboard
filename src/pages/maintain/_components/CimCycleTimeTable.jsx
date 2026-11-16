import { useMemo } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import { CommonDataTable } from '@/components/table/CommonTable';
import { Button } from '@/components/ui/button';

const MFG_BADGE = {
  SMT: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  DIP: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  FA: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  MT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function MfgTypeBadge({ value }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const cls = MFG_BADGE[value.toUpperCase()] ?? 'bg-secondary text-secondary-foreground';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {value}
    </span>
  );
}

function fmtCycleTime(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return parseFloat(Number(v).toFixed(4)).toString();
}

function fmtDateTime(v) {
  if (!v) return '—';
  return String(v).replace('T', ' ').slice(0, 16) || '—';
}

// Column definitions — ColDef[]
// key      : unique string
// header   : string | () => JSX
// cell     : (row, globalIndex) => JSX
// className: td + th class
function getColumns({ onEdit }) {
  return [
    {
      key: 'seq',
      header: '#',
      cell: (_, idx) => <span className="tabular-nums text-muted-foreground">{idx + 1}</span>,
      className: 'w-10',
    },
    {
      key: 'modelName',
      header: 'Model Name',
      cell: (row) => (
        <span className="block max-w-45 truncate font-medium" title={row.modelName}>
          {row.modelName || '—'}
        </span>
      ),
    },
    {
      key: 'partNumber',
      header: 'Part Number',
      cell: (row) => (
        <span
          className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
          title={row.partNumber}
        >
          {row.partNumber || '—'}
        </span>
      ),
    },
    {
      key: 'mfgType',
      header: 'MfgType',
      cell: (row) => <MfgTypeBadge value={row.mfgType} />,
      className: 'w-24',
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (row) => <span className="font-mono text-xs font-medium">{row.stage || '—'}</span>,
      className: 'w-20',
    },
    {
      key: 'stageDes',
      header: 'Stage Desc',
      cell: (row) => (
        <span className="block max-w-55 truncate text-muted-foreground" title={row.stageDes}>
          {row.stageDes || '—'}
        </span>
      ),
    },
    {
      key: 'cycleTime',
      header: () => <span className="block w-full text-right">Cycle Time</span>,
      cell: (row) => (
        <span className="block text-right tabular-nums font-semibold">
          {fmtCycleTime(row.cycleTime)}
        </span>
      ),
      className: 'w-28',
    },
    {
      key: 'targetUph',
      header: () => <span className="block w-full text-right">Target UPH</span>,
      cell: (row) => (
        <span className="block text-right tabular-nums font-semibold text-primary">
          {row.targetUph != null ? Number(row.targetUph).toLocaleString() : '—'}
        </span>
      ),
      className: 'w-28',
    },
    {
      key: 'updatedAt',
      header: 'Updated At',
      cell: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {fmtDateTime(row.updatedAt || row.createdAt)}
        </span>
      ),
      className: 'w-36',
    },
    {
      key: 'actions',
      header: '',
      cell: (row, idx) => (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Sửa dòng ${idx + 1}`}
            onClick={() => onEdit(row)}
            className="size-7 border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ),
      className: 'w-10',
    },
  ];
}

// Search fields
const SEARCH_FIELDS = ['modelName', 'partNumber', 'mfgType', 'stage', 'stageDes', 'targetUph'];

// CimCycleTimeTable
export function CimCycleTimeTable({ rows = [], isLoading, onEdit, onAdd, isFetching, onRefetch }) {
  const columns = useMemo(() => getColumns({ onEdit }), [onEdit]);

  return (
    <CommonDataTable
      data={rows}
      columns={columns}
      isLoading={isLoading}
      searchFields={SEARCH_FIELDS}
      searchPlaceholder="Tìm Model, Part, MfgType..."
      pageSize={20}
      skeletonColumnCount={9}
      skeletonRowCount={7}
    >
      {onRefetch && (
        <Button
          variant="outline"
          size="icon-sm"
          className="size-8"
          disabled={isFetching}
          onClick={onRefetch}
          aria-label="Làm mới"
          title="Làm mới"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
        </Button>
      )}
      {onAdd && (
        <Button size="sm" className="h-8 gap-1.5" onClick={onAdd}>
          + Thêm
        </Button>
      )}
    </CommonDataTable>
  );
}
