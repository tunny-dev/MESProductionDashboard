import { useState, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Play,
  BarChart3,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Table as TableIcon,
  Search,
  FileCode,
  Download,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Layers,
  ShieldCheck,
  Database,
  SlidersHorizontal,
  Code2,
  RefreshCw,
  Globe,
  Hash,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { systemLogsApi } from '@/services/system-logs.service';
import {
  inlineSqlParameters,
  getRowValue,
  wrapWithStatistics,
} from '@/features/system-logs/utils/sqlHelpers';

function exportToCsv(columns, rows, filename = 'sql_result.csv') {
  if (!columns || !rows || rows.length === 0) return;
  const headerLine = columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((r) =>
    columns
      .map((c) => {
        const val = getRowValue(r, c);
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SqlStudioModal({ isOpen, onClose, initialIndex = 0, sqlEvents = [], trace = {} }) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingMode, setLoadingMode] = useState(null); // 'data' | 'analyze' | null
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'analyze' | 'inlined'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Editable SQL & Params state per query index
  const [editedSql, setEditedSql] = useState('');
  const [editedParams, setEditedParams] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Update selected index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const idx = Math.max(0, Math.min(initialIndex, sqlEvents.length - 1));
      setSelectedIndex(idx);
    }
  }, [isOpen, initialIndex, sqlEvents.length]);

  const currentEvent = sqlEvents[selectedIndex] || null;

  // Reset edited SQL & Params when switching query
  useEffect(() => {
    if (currentEvent) {
      setEditedSql(currentEvent.sql || '');
      setEditedParams(currentEvent.paramsJson || '');
      setResult(null);
      setError(null);
      setFilterText('');
      setSortConfig({ key: null, direction: 'asc' });
    }
  }, [selectedIndex, currentEvent]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleResetQuery = () => {
    if (currentEvent) {
      setEditedSql(currentEvent.sql || '');
      setEditedParams(currentEvent.paramsJson || '');
      setError(null);
    }
  };

  const handleExecute = useCallback(
    async (mode) => {
      if (!editedSql.trim()) return;
      try {
        setLoadingMode(mode);
        setError(null);
        const res = await systemLogsApi.executeSql({
          sql: editedSql,
          paramsJson: editedParams,
          mode,
          maxRows: 100,
        });
        setResult(res);
        setActiveTab(mode === 'analyze' ? 'analyze' : 'data');
      } catch (err) {
        setError(err.message || 'Lỗi thực thi SQL');
      } finally {
        setLoadingMode(null);
      }
    },
    [editedSql, editedParams]
  );

  // Shortcut Ctrl+Enter / Cmd+Enter to run query
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute('data');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleExecute]);

  // Executable SQL with inlined parameters
  const executableSql = useMemo(() => {
    if (result?.inlinedSql) return result.inlinedSql;
    return inlineSqlParameters(editedSql, editedParams);
  }, [editedSql, editedParams, result?.inlinedSql]);

  // Query wrapped with SET STATISTICS IO, TIME ON / OFF
  const statsExecutableSql = useMemo(() => {
    return wrapWithStatistics(executableSql);
  }, [executableSql]);

  // Filter & sort data rows
  const resultRows = result?.rows;
  const filteredAndSortedRows = useMemo(() => {
    if (!resultRows || !Array.isArray(resultRows)) return [];
    let list = [...resultRows];

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '')
            .toLowerCase()
            .includes(q)
        )
      );
    }

    if (sortConfig.key) {
      list.sort((a, b) => {
        const valA = getRowValue(a, sortConfig.key);
        const valB = getRowValue(b, sortConfig.key);
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return sortConfig.direction === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [resultRows, filterText, sortConfig]);

  const handleSort = (col) => {
    setSortConfig((prev) => {
      if (prev.key === col) {
        return { key: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: col, direction: 'asc' };
    });
  };

  const elapsedMs = result?.elapsedMs ?? result?.executionElapsedMs ?? 0;
  const stats = result?.stats ?? result?.ioStatistics ?? null;
  const hasMore = result?.hasMoreRows ?? result?.isCapped ?? false;
  const warnings = stats?.warnings ?? result?.warnings ?? [];
  const rawMessages = Array.isArray(stats?.rawMessages)
    ? stats.rawMessages.join('\n')
    : (stats?.rawMessages ?? '');

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`!p-0 !gap-0 overflow-hidden dark:bg-[#111217] bg-white border dark:border-[#22252b] border-slate-300 dark:text-[#f4f5f7] text-slate-800 shadow-2xl transition-all duration-150 !flex !flex-col !sm:max-w-none sm:max-w-none ${
          isFullscreen
            ? '!w-screen !h-screen !max-w-none !max-h-none !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0'
            : '!w-[95vw] !max-w-[1600px] !h-[92vh] !max-h-[92vh] rounded-xl'
        }`}
        style={
          isFullscreen
            ? {
                width: '100vw',
                height: '100vh',
                maxWidth: '100vw',
                maxHeight: '100vh',
                top: 0,
                left: 0,
                transform: 'none',
              }
            : {
                width: '95vw',
                maxWidth: '1600px',
                height: '92vh',
                maxHeight: '92vh',
              }
        }
        showCloseButton={false}
      >
        <div className="border-b dark:border-[#22252b] border-slate-200 shrink-0 select-none">
          {/* Top Row: Title, Sandbox Badge, Window Controls */}
          <div className="flex items-center justify-between px-6 py-3.5 dark:bg-[#181b1f] bg-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#3274d9]/25 to-[#3274d9]/10 text-[#5794f2] border border-[#3274d9]/40 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-base dark:text-white text-slate-900 tracking-tight">
                  MES SQL Studio &amp; Debugger
                </h2>
                <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-[#73bf69]/15 text-[#73bf69] border border-[#73bf69]/30 flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Read-Only Sandbox (SELECT / DECLARE)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-8 w-8 p-0 dark:text-[#8e94a0] text-slate-600 hover:dark:text-white hover:dark:bg-[#22252b] hover:bg-slate-200 rounded-md"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Workbench'}
                </TooltipContent>
              </Tooltip>

              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 dark:text-[#8e94a0] text-slate-600 hover:dark:text-white hover:bg-red-500/15 hover:text-red-500 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 px-6 py-2.5 dark:bg-[#14161b] bg-slate-50 border-t dark:border-[#22252b]/60 border-slate-200/80 text-xs font-sans">
            <div className="flex items-center gap-1.5 text-[#8e94a0]">
              <Hash className="h-3.5 w-3.5 text-[#3274d9]" />
              <span>Trace ID:</span>
              <code className="font-semibold select-all dark:text-slate-200 text-slate-800 bg-black/20 dark:border-[#22252b] border-slate-300 border px-2 py-0.5 rounded">
                {trace.traceId || 'N/A'}
              </code>
            </div>

            <span className="text-[#8e94a0]/40">•</span>

            <div className="flex items-center gap-1.5 text-[#8e94a0]">
              <Globe className="h-3.5 w-3.5 text-[#5794f2]" />
              <span>Endpoint:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-[#3274d9]/10 text-[#5794f2] border border-[#3274d9]/25">
                {trace.method || 'GET'} {trace.path || ''}
              </span>
            </div>

            <span className="text-[#8e94a0]/40">•</span>

            <div className="flex items-center gap-1.5 text-[#8e94a0]">
              <Layers className="h-3.5 w-3.5 text-[#b58df1]" />
              <span>Queries in Trace:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/25">
                {sqlEvents.length} statement(s)
              </span>
            </div>

            {trace.totalDurationMs !== undefined && (
              <>
                <span className="text-[#8e94a0]/40">•</span>
                <div className="flex items-center gap-1.5 text-[#8e94a0]">
                  <Clock className="h-3.5 w-3.5 text-[#73bf69]" />
                  <span>Trace Latency:</span>
                  <span className="font-semibold text-[#73bf69]">{trace.totalDurationMs} ms</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel
              defaultSize={22}
              minSize={15}
              maxSize={35}
              className="flex flex-col min-h-0 dark:bg-[#14161b] bg-slate-50 select-none"
            >
              <div className="p-3.5 border-b dark:border-[#22252b] border-slate-200 text-xs font-semibold dark:text-[#f4f5f7] text-slate-800 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#5794f2]" /> Trace Queries (
                  {sqlEvents.length})
                </span>
                <span className="text-[11px] font-normal text-[#8e94a0]">Click to select</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y dark:divide-[#22252b] divide-slate-200">
                {sqlEvents.map((evt, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isSlow = evt.durationMs >= 1000 || evt.eventType === 'slow_sql';
                  const snippet = (evt.sql || '')
                    .replace(/[\r\n\t]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 60);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start gap-2.5 ${
                        isSelected
                          ? 'dark:bg-[#3274d9]/15 bg-blue-50 border-l-4 border-l-[#3274d9]'
                          : 'hover:dark:bg-[#181b1f] hover:bg-slate-100 border-l-4 border-l-transparent'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold mt-0.5 ${
                          isSelected
                            ? 'bg-[#3274d9] text-white shadow-sm'
                            : 'bg-slate-700/30 dark:text-[#8e94a0] text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-semibold truncate dark:text-[#f4f5f7] text-slate-800">
                            Query #{idx + 1}
                          </span>
                          <span
                            className={`font-sans text-[10px] px-1.5 py-0.2 rounded border ${
                              isSlow
                                ? 'border-[#faad14]/40 text-[#faad14] bg-[#faad14]/10 font-bold'
                                : 'border-[#22252b] text-[#8e94a0]'
                            }`}
                          >
                            {evt.durationMs}ms
                          </span>
                        </div>
                        <div className="text-[11px] font-sans text-[#8e94a0] line-clamp-2 leading-tight">
                          {snippet || 'Empty statement'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={78} className="flex flex-col min-h-0 min-w-0">
              <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                <ResizablePanel
                  defaultSize={38}
                  minSize={22}
                  maxSize={65}
                  className="flex flex-col min-h-0 dark:bg-[#111217] bg-white border-b dark:border-[#22252b] border-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-slate-50 shrink-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleExecute('data')}
                        disabled={loadingMode !== null}
                        className="h-7 px-3 text-xs bg-[#3274d9] hover:bg-[#2461c2] text-white border-0 font-semibold shadow-sm transition-colors"
                      >
                        {loadingMode === 'data' ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin text-white" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                            Run Query
                          </>
                        )}
                        <span className="ml-1.5 text-[10px] opacity-75 font-sans">Ctrl+Enter</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExecute('analyze')}
                        disabled={loadingMode !== null}
                        className="h-7 px-3 text-xs border-[#faad14]/40 text-[#faad14] hover:bg-[#faad14]/10 dark:bg-[#181b1f] bg-white font-semibold transition-colors"
                      >
                        {loadingMode === 'analyze' ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin text-[#faad14]" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                            Analyze Stats
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(executableSql, 'studio-inlined')}
                        className="h-7 px-2.5 text-xs border-[#73bf69]/40 text-[#73bf69] hover:bg-[#73bf69]/10 dark:bg-[#181b1f] bg-white font-semibold transition-colors"
                        title="Copy query with inlined parameter values (Ready for SSMS / DBeaver)"
                      >
                        {copiedKey === 'studio-inlined' ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5" /> Inlined Copied!
                          </>
                        ) : (
                          <>
                            <FileCode className="h-3.5 w-3.5 mr-1.5" /> Copy Executable
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(statsExecutableSql, 'studio-stats')}
                        className="h-7 px-2.5 text-xs border-[#faad14]/40 text-[#faad14] hover:bg-[#faad14]/10 dark:bg-[#181b1f] bg-white font-semibold transition-colors"
                        title="Copy query wrapped with SET STATISTICS IO, TIME ON / OFF for profiling in SSMS"
                      >
                        {copiedKey === 'studio-stats' ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5 text-[#faad14]" /> Stats SQL
                            Copied!
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Copy with Stats
                          </>
                        )}
                      </Button>

                      {result?.rows && result.rows.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            exportToCsv(
                              result.columns,
                              result.rows,
                              `mes_query_${selectedIndex + 1}_results.csv`
                            )
                          }
                          className="h-7 px-2.5 text-xs dark:border-[#22252b] border-slate-300 dark:text-[#c7d0d9] text-slate-700 hover:dark:text-white"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5 text-[#5794f2]" /> Export CSV
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleResetQuery}
                            className="h-7 px-2.5 text-xs text-[#8e94a0] hover:dark:text-white"
                          >
                            <RotateCcw className="h-3 w-3 mr-1.5" /> Reset Original
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Revert SQL &amp; parameters back to the original Trace log
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    <ResizablePanel
                      defaultSize={68}
                      minSize={30}
                      className="flex flex-col min-h-0 p-3 dark:bg-[#0c1017] bg-[#0c1017]"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#8e94a0] uppercase mb-1.5 shrink-0">
                        <span className="flex items-center gap-1.5">
                          <Code2 className="h-3.5 w-3.5 text-[#5794f2]" /> T-SQL Query (SELECT /
                          DECLARE only)
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Editable sandbox
                        </span>
                      </div>
                      <textarea
                        value={editedSql}
                        onChange={(e) => setEditedSql(e.target.value)}
                        placeholder="Enter SELECT query with parameters..."
                        className="flex-1 w-full p-2 text-xs font-sans dark:text-slate-100 text-slate-100 bg-transparent resize-none focus:outline-none leading-relaxed select-text placeholder-slate-600 border dark:border-[#22252b]/80 border-slate-800 rounded"
                        spellCheck={false}
                      />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel
                      defaultSize={32}
                      minSize={20}
                      className="flex flex-col min-h-0 p-3 dark:bg-[#0c1017] bg-[#0c1017]"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#8e94a0] uppercase mb-1.5 shrink-0">
                        <span className="flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-[#faad14]" /> Parameters
                          (JSON)
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {`{"@param": "val"}`}
                        </span>
                      </div>
                      <textarea
                        value={editedParams}
                        onChange={(e) => setEditedParams(e.target.value)}
                        placeholder='{"@mo": "012345"}'
                        className="flex-1 w-full p-2 text-xs font-sans dark:text-[#faad14] text-amber-300 bg-transparent resize-none focus:outline-none leading-relaxed select-text placeholder-slate-600 border dark:border-[#22252b]/80 border-slate-800 rounded"
                        spellCheck={false}
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                  defaultSize={62}
                  minSize={30}
                  className="flex flex-col min-h-0 dark:bg-[#111217] bg-white"
                >
                  <div className="flex items-center justify-between px-3 py-1.5 border-b dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-slate-100 shrink-0 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab('data')}
                        className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          activeTab === 'data'
                            ? 'bg-[#3274d9] text-white shadow-sm'
                            : 'dark:text-[#8e94a0] text-slate-600 hover:dark:text-white'
                        }`}
                      >
                        <TableIcon className="h-3.5 w-3.5" />
                        Data Grid ({result?.rowCount || 0}
                        {hasMore ? ' capped' : ''})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('analyze')}
                        className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          activeTab === 'analyze'
                            ? 'bg-[#faad14] text-slate-950 font-bold shadow-sm'
                            : 'dark:text-[#8e94a0] text-slate-600 hover:dark:text-white'
                        }`}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Performance &amp; IO Stats
                        {stats && (
                          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-bold">
                            Reads: {stats.totalLogicalReads}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('inlined')}
                        className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          activeTab === 'inlined'
                            ? 'bg-[#73bf69] text-slate-950 font-bold shadow-sm'
                            : 'dark:text-[#8e94a0] text-slate-600 hover:dark:text-white'
                        }`}
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        Inlined Executable Script
                      </button>
                    </div>

                    {result && (
                      <div className="flex items-center gap-3 text-[11px] text-[#8e94a0] font-sans">
                        <span>
                          Execution Time: <strong className="text-[#73bf69]">{elapsedMs} ms</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="m-3 p-3 rounded border border-[#f2495c]/40 bg-[#f2495c]/10 text-xs text-[#f2495c] flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Execution Error:</div>
                        <div className="font-sans break-all mt-0.5">{error}</div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'data' && (
                    <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8e94a0]" />
                          <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Search across all returned cells..."
                            className="w-full pl-8 pr-3 py-1 text-xs rounded border dark:border-[#22252b] border-slate-300 dark:bg-[#0c1017] bg-white text-slate-100 placeholder-[#8e94a0] focus:outline-none focus:border-[#3274d9]"
                          />
                        </div>
                        {result && (
                          <div className="text-[11px] text-[#8e94a0] font-sans">
                            Showing {filteredAndSortedRows.length} of {result.rowCount || 0} rows
                            {hasMore && ' (100 rows preview cap)'}
                          </div>
                        )}
                      </div>

                      {!result ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-[#8e94a0]">
                          <Database className="h-8 w-8 mb-2 opacity-30 text-[#5794f2]" />
                          <div>
                            Ready to execute. Click <strong>[ ▶ Run Query ]</strong> or press{' '}
                            <strong>Ctrl+Enter</strong>.
                          </div>
                        </div>
                      ) : !result.columns || result.columns.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#8e94a0]">
                          Query executed successfully with 0 columns returned.
                        </div>
                      ) : filteredAndSortedRows.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#8e94a0]">
                          No rows match the search query &quot;{filterText}&quot;.
                        </div>
                      ) : (
                        <div className="flex-1 rounded border dark:border-[#22252b] border-slate-300 dark:bg-[#0c1017] bg-white overflow-auto shadow-inner">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead className="sticky top-0 z-10 dark:bg-[#181b1f] bg-slate-100 border-b dark:border-[#22252b] border-slate-300 shadow-sm">
                              <tr>
                                <th className="p-2 text-[11px] font-bold text-[#8e94a0] border-r dark:border-[#22252b] border-slate-200 w-10 text-center">
                                  #
                                </th>
                                {result.columns.map((col) => {
                                  const isSorted = sortConfig.key === col;
                                  return (
                                    <th
                                      key={col}
                                      onClick={() => handleSort(col)}
                                      className="p-2 text-[11px] font-bold dark:text-[#f4f5f7] text-slate-700 whitespace-nowrap border-r dark:border-[#22252b] border-slate-200 cursor-pointer select-none hover:bg-black/10 transition-colors"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span>{col}</span>
                                        {isSorted && (
                                          <span className="text-[#3274d9] font-bold">
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                          </span>
                                        )}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-[#22252b] divide-slate-200">
                              {filteredAndSortedRows.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className="hover:dark:bg-[#14161b] hover:bg-slate-50 transition-colors"
                                >
                                  <td className="p-2 text-[11px] text-[#8e94a0] font-sans text-center border-r dark:border-[#22252b] border-slate-200">
                                    {rIdx + 1}
                                  </td>
                                  {result.columns.map((col) => {
                                    const val = getRowValue(row, col);
                                    const isNull = val === null || val === undefined;
                                    return (
                                      <td
                                        key={col}
                                        className="p-2 whitespace-nowrap border-r dark:border-[#22252b] border-slate-200 text-xs select-text font-sans"
                                      >
                                        {isNull ? (
                                          <span className="text-[10px] text-[#8e94a0] italic bg-slate-800/40 px-1 py-0.5 rounded">
                                            NULL
                                          </span>
                                        ) : (
                                          <span className="dark:text-[#c7d0d9] text-slate-800">
                                            {String(val)}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'analyze' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {warnings && warnings.length > 0 && (
                        <div className="space-y-1">
                          {warnings.map((warn, wIdx) => (
                            <div
                              key={wIdx}
                              className="rounded border border-[#faad14]/40 bg-[#faad14]/10 p-2.5 text-xs text-[#faad14] flex items-center gap-2"
                            >
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>{warn}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded border dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-slate-50 p-3 text-center">
                          <div className="text-[11px] font-semibold dark:text-[#8e94a0] text-slate-500 uppercase">
                            Logical Reads
                          </div>
                          <div
                            className={`text-2xl font-bold font-sans mt-0.5 ${
                              (stats?.totalLogicalReads || 0) > 1000
                                ? 'text-[#faad14]'
                                : 'text-[#73bf69]'
                            }`}
                          >
                            {(stats?.totalLogicalReads ?? 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded border dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-slate-50 p-3 text-center">
                          <div className="text-[11px] font-semibold dark:text-[#8e94a0] text-slate-500 uppercase">
                            Scan Count
                          </div>
                          <div
                            className={`text-2xl font-bold font-sans mt-0.5 ${
                              (stats?.totalScanCount || 0) > 1 ? 'text-[#faad14]' : 'text-[#5794f2]'
                            }`}
                          >
                            {stats?.totalScanCount ?? 0}
                          </div>
                        </div>

                        <div className="rounded border dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-slate-50 p-3 text-center">
                          <div className="text-[11px] font-semibold dark:text-[#8e94a0] text-slate-500 uppercase">
                            CPU Time
                          </div>
                          <div className="text-2xl font-bold font-sans mt-0.5 dark:text-[#f4f5f7] text-slate-800">
                            {stats?.cpuTimeMs ?? 0} ms
                          </div>
                        </div>

                        <div className="rounded border dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-slate-50 p-3 text-center">
                          <div className="text-[11px] font-semibold dark:text-[#8e94a0] text-slate-500 uppercase">
                            Elapsed Time
                          </div>
                          <div className="text-2xl font-bold font-sans mt-0.5 text-[#5794f2]">
                            {stats?.elapsedTimeMs || elapsedMs} ms
                          </div>
                        </div>
                      </div>

                      {stats?.tables && stats.tables.length > 0 ? (
                        <div className="rounded border dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-white overflow-hidden shadow-sm">
                          <div className="p-2.5 dark:bg-[#181b1f] bg-slate-100 border-b dark:border-[#22252b] border-slate-200 text-xs font-semibold dark:text-[#f4f5f7] text-slate-800 flex items-center justify-between">
                            <span>Table I/O Breakdown</span>
                            <span className="text-[11px] text-[#8e94a0]">
                              {stats.tables.length} table(s) accessed
                            </span>
                          </div>
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead className="dark:bg-[#111217] bg-slate-50 border-b dark:border-[#22252b] border-slate-200 text-[#8e94a0]">
                              <tr>
                                <th className="p-2.5 font-semibold">Table</th>
                                <th className="p-2.5 font-semibold text-right">Scan Count</th>
                                <th className="p-2.5 font-semibold text-right">Logical Reads</th>
                                <th className="p-2.5 font-semibold text-right">Physical Reads</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-[#22252b] divide-slate-100">
                              {stats.tables.map((t, tIdx) => (
                                <tr
                                  key={tIdx}
                                  className="hover:dark:bg-[#181b1f]/50 hover:bg-slate-50"
                                >
                                  <td className="p-2.5 font-semibold dark:text-white text-slate-900">
                                    {t.tableName}
                                  </td>
                                  <td className="p-2.5 text-right font-sans">
                                    <span
                                      className={
                                        t.scanCount > 1
                                          ? 'text-[#faad14] font-bold'
                                          : 'dark:text-[#c7d0d9] text-slate-700'
                                      }
                                    >
                                      {t.scanCount}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-sans">
                                    <span
                                      className={
                                        t.logicalReads > 500
                                          ? 'text-[#faad14] font-bold'
                                          : 'text-[#73bf69]'
                                      }
                                    >
                                      {t.logicalReads.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-sans dark:text-[#8e94a0] text-slate-500">
                                    {t.physicalReads}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded border dark:border-[#22252b] border-slate-200 dark:bg-[#14161b] bg-white p-6 text-center text-xs text-[#8e94a0]">
                          No detailed table I/O breakdown recorded. Run{' '}
                          <strong>[ 📊 Analyze Stats ]</strong> to collect statistics.
                        </div>
                      )}

                      {rawMessages && (
                        <details className="text-xs text-[#8e94a0] cursor-pointer">
                          <summary className="hover:dark:text-white">
                            View raw TDS STATISTICS messages
                          </summary>
                          <pre className="mt-2 p-3 rounded bg-black/50 text-[11px] font-sans text-slate-300 whitespace-pre-wrap overflow-x-auto">
                            {rawMessages}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                  {activeTab === 'inlined' && (
                    <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
                        <span className="text-[11px] text-[#8e94a0] font-sans">
                          Complete executable script with variables substituted. Ready for SSMS /
                          DBeaver:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(statsExecutableSql, 'studio-stats-tab')}
                            className="h-6 px-2.5 text-xs border-[#faad14]/40 text-[#faad14] hover:bg-[#faad14]/10 dark:bg-[#181b1f] bg-white font-semibold"
                          >
                            {copiedKey === 'studio-stats-tab' ? (
                              <>
                                <Check className="h-3 w-3 mr-1 text-[#faad14]" /> Stats Copied!
                              </>
                            ) : (
                              <>
                                <BarChart3 className="h-3 w-3 mr-1" /> Copy with Stats
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCopy(executableSql, 'studio-inlined-tab')}
                            className="h-6 px-2.5 text-xs bg-[#73bf69] hover:bg-[#5fa855] text-slate-950 font-bold"
                          >
                            {copiedKey === 'studio-inlined-tab' ? (
                              <>
                                <Check className="h-3 w-3 mr-1" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" /> Copy Script
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <pre className="flex-1 rounded-md border dark:border-[#22252b] border-slate-700 dark:bg-[#0c1017] bg-[#0c1017] p-4 font-sans text-xs text-slate-200 leading-relaxed overflow-auto select-text">
                        {executableSql}
                      </pre>
                    </div>
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}

SqlStudioModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialIndex: PropTypes.number,
  sqlEvents: PropTypes.arrayOf(PropTypes.object),
  trace: PropTypes.object,
};
