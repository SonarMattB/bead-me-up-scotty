import type { Bead } from "./schema";
import { isBlocked, titleCase } from "./beads-view";

/**
 * The board's column model — shared by the Board (Kanban) and List views so they
 * agree on which column a bead belongs to and the column ordering used for the
 * manual run-order. Column order here defines top-to-bottom order in the List.
 */
export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  cmd: string;
  droppable: boolean;
  /** The bd status a drop into this column sets (undefined = not a real status). */
  status?: string;
  test: (b: Bead, blocked: boolean) => boolean;
}

/** The 5 built-in columns — always present, in this default order. */
const BASE_COLUMNS: BoardColumn[] = [
  { id: "backlog", name: "Backlog", color: "#64748b", cmd: "deferred", droppable: true, status: "deferred", test: (b) => b.status === "deferred" },
  { id: "ready", name: "Ready", color: "#3b82f6", cmd: "bd ready", droppable: true, status: "open", test: (b, blocked) => b.status === "open" && !blocked },
  { id: "in_progress", name: "In Progress", color: "#d97706", cmd: "in_progress", droppable: true, status: "in_progress", test: (b) => b.status === "in_progress" || b.status === "hooked" },
  { id: "blocked", name: "Blocked", color: "#ef4444", cmd: "bd blocked", droppable: false, test: (b, blocked) => blocked && b.status !== "deferred" && b.status !== "closed" },
  { id: "done", name: "Done", color: "#16a34a", cmd: "closed", droppable: true, status: "closed", test: (b) => b.status === "closed" },
];

/** Back-compat: base columns in their default order, no custom statuses. */
export const BOARD_COLUMNS: BoardColumn[] = BASE_COLUMNS;
export const COLUMN_ORDER: string[] = BASE_COLUMNS.map((c) => c.id);

// Rotating palette for custom-status columns beyond the 5 built-in colors above.
const CUSTOM_COLORS = ["#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#0ea5e9"];

/** One column per project-defined custom status (`bd config get status.custom`). */
function customColumn(status: string, index: number): BoardColumn {
  return {
    id: status,
    name: titleCase(status),
    color: CUSTOM_COLORS[index % CUSTOM_COLORS.length],
    cmd: status,
    droppable: true,
    status,
    test: (b) => b.status === status,
  };
}

/**
 * The board's full column set: the 5 built-ins plus one column per custom
 * status, arranged per `order` (a saved column-id order, e.g. from
 * BoardPrefs). Ids in `order` but no longer relevant (a removed custom
 * status) are dropped; ids not yet in `order` (new custom statuses) are
 * appended after the base columns, before any other trailing custom ones.
 */
export function buildBoardColumns(customStatuses: string[], order?: string[]): BoardColumn[] {
  const all = [...BASE_COLUMNS, ...customStatuses.map(customColumn)];
  if (!order || order.length === 0) return all;

  const byId = new Map(all.map((c) => [c.id, c]));
  const ordered: BoardColumn[] = [];
  for (const id of order) {
    const col = byId.get(id);
    if (col) {
      ordered.push(col);
      byId.delete(id);
    }
  }
  // Anything left (new since the order was saved) keeps its default position.
  for (const col of all) if (byId.has(col.id)) ordered.push(col);
  return ordered;
}

/**
 * Which board column a bead belongs to (first matching test), or null.
 * `customStatuses` defaults to none — callers that don't (yet) know about a
 * project's custom statuses just get the 5 built-in columns, as before.
 */
export function colOf(
  bead: Bead,
  index: Map<string, Bead>,
  customStatuses: string[] = [],
): string | null {
  const blocked = isBlocked(bead, index);
  const columns = customStatuses.length ? buildBoardColumns(customStatuses) : BASE_COLUMNS;
  for (const c of columns) if (c.test(bead, blocked)) return c.id;
  return null;
}

export type BoardSortMode = "priority" | "updated" | "manual";

function updatedTime(card: Bead): number {
  const parsed = Date.parse(card.updated_at || card.created_at || "");
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function byUpdatedThenPriority(left: Bead, right: Bead): number {
  const updatedDiff = updatedTime(right) - updatedTime(left);
  return updatedDiff || left.priority - right.priority || left.id.localeCompare(right.id);
}

function byPriorityThenUpdated(first: Bead, second: Bead): number {
  return first.priority - second.priority || byUpdatedThenPriority(first, second);
}

/** Sort cards according to the board's explicit display mode. */
export function sortBoardCards(
  cards: Bead[], mode: BoardSortMode, order?: string[],
): Bead[] {
  const rank = new Map((order ?? []).map((id, i) => [id, i]));

  return [...cards].sort((cardA, cardB) => {
    if (mode === "updated") return byUpdatedThenPriority(cardA, cardB);
    if (mode === "priority") return byPriorityThenUpdated(cardA, cardB);

    const rankA = rank.get(cardA.id) ?? Number.POSITIVE_INFINITY;
    const rankB = rank.get(cardB.id) ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    return cardA.priority - cardB.priority;
  });
}

/** Preserve saved manual order, falling back to priority for unranked cards. */
export function sortByOrder(cards: Bead[], order?: string[]): Bead[] {
  return sortBoardCards(cards, "manual", order);
}
