import { memo } from "react";
import { createGuestDragPreview } from "../lib/drag-preview";
import { useI18n } from "@/i18n/provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SeatProps = {
  seatNumber: number;
  x: number;
  y: number;
  occupantGuestId?: string | null;
  occupantName?: string | null;
  occupantGroupColor?: string | null;
  occupantGroupName?: string | null;
  showGroupColors?: boolean;
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

function getContrastingTextColor(hexColor: string): string {
  const value = hexColor.replace("#", "");
  if (value.length !== 6) return "rgb(255 255 255)";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
    return "rgb(255 255 255)";
  }
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness >= 150 ? "rgb(24 24 27)" : "rgb(255 255 255)";
}

function SeatComponent({
  seatNumber,
  x,
  y,
  occupantGuestId,
  occupantName,
  occupantGroupColor,
  occupantGroupName,
  showGroupColors = false,
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
  const { t } = useI18n();
  const initials = occupantName ? getInitials(occupantName) : null;
  const isSeatDraggable = Boolean(enableSeatDrag && occupantGuestId);
  const usesGroupColor =
    Boolean(showGroupColors) &&
    Boolean(occupantName) &&
    Boolean(occupantGroupColor) &&
    !isConflict &&
    !isDropTarget &&
    !isLinkedDropPreview &&
    !isSelected &&
    !isSelectedGuestSeat;
  const resolvedGroupColor = occupantGroupColor ?? null;
  const seatStyle =
    usesGroupColor && resolvedGroupColor
      ? {
          left: x,
          top: y,
          backgroundColor: resolvedGroupColor,
          borderColor: resolvedGroupColor,
          color: getContrastingTextColor(resolvedGroupColor),
        }
      : { left: x, top: y };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          draggable={isSeatDraggable}
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
              : usesGroupColor
                ? "border-transparent"
              : occupantName
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-zinc-300 bg-white text-zinc-700"
          }`}
          style={seatStyle}
        >
          {initials ?? seatNumber}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {occupantName
          ? t("seat.seatWithName", {
              seat: seatNumber,
              name: occupantGroupName ? `${occupantName} (${occupantGroupName})` : occupantName,
            })
          : t("seat.seatLabel", { seat: seatNumber })}
      </TooltipContent>
    </Tooltip>
  );
}

function areSeatPropsEqual(prev: SeatProps, next: SeatProps) {
  return (
    prev.seatNumber === next.seatNumber &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.occupantGuestId === next.occupantGuestId &&
    prev.occupantName === next.occupantName &&
    prev.occupantGroupColor === next.occupantGroupColor &&
    prev.occupantGroupName === next.occupantGroupName &&
    prev.showGroupColors === next.showGroupColors &&
    prev.isSelectedGuestSeat === next.isSelectedGuestSeat &&
    prev.isSelected === next.isSelected &&
    prev.isConflict === next.isConflict &&
    prev.isDropTarget === next.isDropTarget &&
    prev.isLinkedDropPreview === next.isLinkedDropPreview &&
    prev.isDragActive === next.isDragActive &&
    prev.enableSeatDrag === next.enableSeatDrag
  );
}

export const Seat = memo(SeatComponent, areSeatPropsEqual);
