import { useState } from 'react';
import { Star } from 'lucide-react';

import { toast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';

import { CimCycleTimeTable } from '@/pages/maintain/_components/CimCycleTimeTable';
import { CimCycleTimeForm } from '@/pages/maintain/_components/CimCycleTimeForm';
import { useCctList, useCctCreate, useCctUpdate } from '@/hooks/useCimCycleTime';

export function CimCycleTimePage() {
  const user = useAuthStore((s) => s.user);
  const username = user?.name ?? user?.id ?? 'system';

  const { data: rows = [], isLoading, isFetching, refetch } = useCctList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const createMutation = useCctCreate();
  const updateMutation = useCctUpdate();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handleEdit(row) {
    setEditRow(row);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditRow(null);
    setDialogOpen(true);
  }

  function handleSubmit(form) {
    if (editRow) {
      updateMutation.mutate(
        { id: editRow.id, payload: form, modifier: username },
        {
          onSuccess: () => {
            toast.add({ title: 'Cập nhật thành công', type: 'success' });
            setDialogOpen(false);
          },
          onError: (err) => {
            toast.add({ title: 'Cập nhật thất bại', description: err?.message, type: 'error' });
          },
        }
      );
    } else {
      createMutation.mutate(
        { payload: form, creator: username },
        {
          onSuccess: () => {
            toast.add({ title: 'Tạo mới thành công', type: 'success' });
            setDialogOpen(false);
          },
          onError: (err) => {
            toast.add({ title: 'Tạo mới thất bại', description: err?.message, type: 'error' });
          },
        }
      );
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-2">
        <Star className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">Cycle Time Maintenance</h2>
      </div>

      <CimCycleTimeTable
        rows={rows}
        isLoading={isLoading}
        isFetching={isFetching}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onRefetch={() => refetch()}
      />

      <CimCycleTimeForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editRow={editRow}
        isPending={isSaving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
