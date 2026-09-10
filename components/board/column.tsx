"use client";
import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bead } from "@/lib/schema";
import { BeadCard } from "./bead-card";
import { cn } from "@/lib/utils";

/** Sortable id for a column's drag handle — namespaced so it can't collide
 * with the column's own `useDroppable({id: col.id})` card-drop-target id. */
export const columnDragId = (colId: string) => `col:${colId}`;

export interface ColumnDef {
  id: string;
  name: string;
  color: string;
  cmd: string;
  droppable: boolean;
}

export function Column({
  col,
  cards,
  childCounts,
  control,
  manualSort = true,
  reorderable = false,
}: {
  col: ColumnDef;
  cards: Bead[];
  /** id -> number of parent-child children, computed once by the board. */
  childCounts?: Map<string, number>;
  control?: React.ReactNode;
  manualSort?: boolean;
  /** Whether the column header is a drag handle for reordering columns. */
  reorderable?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id, disabled: !col.droppable });
  const {
    attributes,
    listeners,
    setNodeRef: setColumnNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnDragId(col.id),
    data: { type: "column", colId: col.id },
    disabled: !reorderable,
  });

  return (
    <section
      ref={setColumnNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex w-[296px] min-h-0 flex-shrink-0 flex-col"
    >
      <div
        {...(reorderable ? { ...attributes, ...listeners } : {})}
        className={cn(
          "flex flex-shrink-0 items-center gap-2 px-1 pb-3",
          reorderable && "cursor-grab touch-none active:cursor-grabbing",
        )}
      >
        <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: col.color }} />
        <span className="text-[13px] font-semibold tracking-[-.005em]">{col.name}</span>
        <span className="rounded-full border border-border bg-[var(--surface-2)] px-2 py-px font-mono text-[11.5px] text-[var(--text-3)]">
          {cards.length}
        </span>
        <span className="flex-1" />
        {control ?? <span className="font-mono text-[10.5px] text-[var(--text-3)]">{col.cmd}</span>}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "bd-scroll flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto overflow-x-hidden rounded-xl p-[4px_4px_14px] transition-[background,outline]",
          isOver && col.droppable
            ? "bg-[var(--brand-weak)] outline-2 outline-dashed outline-[var(--brand)] -outline-offset-2"
            : "outline-2 outline-transparent",
        )}
      >
        <SortableContext items={cards.map((b) => b.id)} strategy={manualSort ? verticalListSortingStrategy : () => null}>
          {cards.map((b) => (
            <BeadCard key={b.id} bead={b} childCount={childCounts?.get(b.id) ?? 0} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="rounded-[11px] border-[1.5px] border-dashed border-border p-[22px_12px] text-center text-[12px] text-[var(--text-3)]">
            No beads
          </div>
        )}
      </div>
    </section>
  );
}
