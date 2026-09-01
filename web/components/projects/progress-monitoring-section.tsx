"use client";

import { useMemo, useState } from "react";

import { ProgressKpiCards } from "@/components/projects/progress-kpi-cards";
import { ProgressHistorySection } from "@/components/projects/progress-history-section";
import { ProgressFormDialog } from "@/components/projects/progress-form-dialog";
import { DeleteProgressDialog } from "@/components/projects/delete-progress-dialog";
import { computeProgressSummary } from "@/lib/services/progress-analytics";
import type { ProgressSnapshot } from "@/lib/serializers/project";

/**
 * Owns the project's progress-record state client-side (create/edit/delete
 * update this array directly rather than reloading the page), and derives
 * the KPI summary from it on every render via the same pure, deterministic
 * `computeProgressSummary` used for the initial server render — so the KPIs
 * stay in sync with the table/chart without a second round-trip.
 */
export function ProgressMonitoringSection({
  projectId,
  initialRecords,
}: {
  projectId: string;
  initialRecords: ProgressSnapshot[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProgressSnapshot | undefined>(undefined);
  const [deletingRecord, setDeletingRecord] = useState<ProgressSnapshot | null>(null);

  const summary = useMemo(() => computeProgressSummary(records), [records]);

  function handleAdd() {
    setEditingRecord(undefined);
    setFormOpen(true);
  }

  function handleEdit(record: ProgressSnapshot) {
    setEditingRecord(record);
    setFormOpen(true);
  }

  function handleSaved(record: ProgressSnapshot) {
    setRecords((prev) => {
      const exists = prev.some((item) => item.id === record.id);
      const next = exists ? prev.map((item) => (item.id === record.id ? record : item)) : [...prev, record];
      // Keep chronological order regardless of insertion/edit order — the
      // rest of the app (KPIs, chart, history table) assumes real date
      // order, not array order (see requirement #5).
      return [...next].sort(
        (a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime(),
      );
    });
  }

  function handleDeleted(id: string) {
    setRecords((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressKpiCards summary={summary} />

      <ProgressHistorySection
        records={records}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={setDeletingRecord}
      />

      <ProgressFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={projectId}
        mode={editingRecord ? "edit" : "create"}
        record={editingRecord}
        onSaved={handleSaved}
      />

      {deletingRecord && (
        <DeleteProgressDialog
          open={deletingRecord !== null}
          onOpenChange={(open) => !open && setDeletingRecord(null)}
          recordId={deletingRecord.id}
          recordDate={deletingRecord.recordDate}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
