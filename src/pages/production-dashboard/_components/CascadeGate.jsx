import { Spinner } from '@/components/ui/loading-overlay';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/**
 * @param {{ title: string, hint: string, action?: React.ReactNode, loading?: boolean }} props
 */
export function CascadeGate({ title, hint, action, loading = false }) {
  return (
    <Empty className="flex-1 border border-solid border-border bg-surface py-16">
      <EmptyHeader>
        {loading ? <Spinner className="mx-auto mb-2 text-production-blue" label={title} /> : null}
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{hint}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}
