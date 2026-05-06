type SeatProps = {
  seatNumber: number;
  x: number;
  y: number;
  occupantName?: string | null;
  isSelectedGuestSeat?: boolean;
  isSelected?: boolean;
  isConflict?: boolean;
  onClick?: (seatNumber: number, clientX: number, clientY: number) => void;
};

export function Seat({
  seatNumber,
  x,
  y,
  occupantName,
  isSelectedGuestSeat = false,
  isSelected = false,
  isConflict = false,
  onClick,
}: SeatProps) {
  return (
    <button
      type="button"
      title={occupantName ? `${seatNumber}: ${occupantName}` : `Seat ${seatNumber}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(seatNumber, event.clientX, event.clientY);
      }}
      className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-medium shadow-sm transition-colors ${
        isConflict
          ? "border-red-500 bg-red-100 text-red-800"
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
      {seatNumber}
    </button>
  );
}
