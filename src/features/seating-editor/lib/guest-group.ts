type GuestGroup = {
  id: string;
  name: string;
  color: string;
};

type GuestWithGroup = {
  id: string;
  group: GuestGroup | null;
  plusOneHostGuestId?: string | null;
};

export function resolveEffectiveGuestGroup(
  guest: GuestWithGroup,
  guestsById: Record<string, GuestWithGroup>,
): GuestGroup | null {
  if (guest.group) {
    return guest.group;
  }

  if (!guest.plusOneHostGuestId) {
    return null;
  }

  const hostGuest = guestsById[guest.plusOneHostGuestId];
  return hostGuest?.group ?? null;
}
