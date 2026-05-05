type SeatProps = {
  seatNumber: number;
  x: number;
  y: number;
};

export function Seat({ seatNumber, x, y }: SeatProps) {
  return (
    <div
      className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-medium text-zinc-700 shadow-sm"
      style={{ left: x, top: y }}
    >
      {seatNumber}
    </div>
  );
}
