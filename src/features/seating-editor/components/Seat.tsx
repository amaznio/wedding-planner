import { createGuestDragPreview } from "../lib/drag-preview";

type SeatProps = {
  seatNumber: number;
  x: number;
  y: number;
  occupantGuestId?: string | null;
  occupantName?: string | null;
  isSelectedGuestSeat?: boolean;
  isSelected?: boolean;
  isConflict?: boolean;
  isDropTarget?: boolean;
  isLinkedDropPreview?: boolean;
  isDragActive?: boolean;
  enableSeatDrag?: boolean;
  onClick?: (seatNumber: number, clientX: number, clientY: number) => void;
  onDragEnter?: (seatNumber: number) => void;
  onDragLeave?: (seatNumber: number) => void;
  onDropGuest?: (seatNumber: number, guestId: string) => void;
  onSeatGuestDragStart?: (guestId: string) => void;
  onSeatGuestDragEnd?: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Seat({
  seatNumber,
  x,
  y,
  occupantGuestId,
  occupantName,
  isSelectedGuestSeat = false,
  isSelected = false,
  isConflict = false,
  isDropTarget = false,
  isLinkedDropPreview = false,
  isDragActive = false,
  enableSeatDrag = false,
  onClick,
  onDragEnter,
  onDragLeave,
  onDropGuest,
  onSeatGuestDragStart,
  onSeatGuestDragEnd,
}: SeatProps) {
  const initials = occupantName ? getInitials(occupantName) : null;
  const isSeatDraggable = Boolean(enableSeatDrag && occupantGuestId);

  return (
    <button
      type="button"
      draggable={isSeatDraggable}
      title={occupantName ? `${seatNumber}: ${occupantName}` : `Seat ${seatNumber}`}
      onDragStart={(event) => {
        if (!isSeatDraggable || !occupantGuestId || !occupantName) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", occupantGuestId);
        const preview = createGuestDragPreview(occupantName);
        event.dataTransfer.setDragImage(preview, 18, 18);
        requestAnimationFrame(() => {
          preview.remove();
        });
        onSeatGuestDragStart?.(occupantGuestId);
      }}
      onDragEnd={() => {
        if (!isSeatDraggable) return;
        onSeatGuestDragEnd?.();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(seatNumber, event.clientX, event.clientY);
      }}
      onDragOver={(event) => {
        if (!isDragActive) return;
        event.preventDefault();
      }}
      onDragEnter={(event) => {
        if (!isDragActive) return;
        event.preventDefault();
        onDragEnter?.(seatNumber);
      }}
      onDragLeave={() => {
        if (!isDragActive) return;
        onDragLeave?.(seatNumber);
      }}
      onDrop={(event) => {
        if (!isDragActive) return;
        event.preventDefault();
        event.stopPropagation();
        const guestId = event.dataTransfer.getData("text/plain");
        if (!guestId) return;
        onDropGuest?.(seatNumber, guestId);
      }}
      className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-medium shadow-sm transition-colors ${
        isConflict
          ? "border-red-500 bg-red-100 text-red-800"
          : isDropTarget
          ? "border-blue-500 bg-blue-100 text-blue-900 ring-2 ring-blue-200"
          : isLinkedDropPreview
          ? "border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-200"
          : isSelected
          ? "border-amber-500 bg-amber-100 text-amber-900 ring-2 ring-amber-200"
          : isSelectedGuestSeat
          ? "border-emerald-500 bg-emerald-100 text-emerald-900"
          : occupantName
            ? "border-blue-300 bg-blue-50 text-blue-800"
            : "border-zinc-300 bg-white text-zinc-700"
      }`}
      style={{ left: x, top: y }}
    >
      {initials ?? seatNumber}
    </button>
  );
}
