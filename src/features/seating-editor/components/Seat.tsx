type SeatProps = {
  seatNumber: number;
  x: number;
  y: number;
};

export function Seat({ seatNumber, x, y }: SeatProps) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm"
      style={{ left: x, top: y }}
    >
      {seatNumber}
    </div>
  );
}
