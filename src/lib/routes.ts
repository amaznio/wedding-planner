export function getWeddingRoutes(weddingId: string) {
  const base = `/weddings/${weddingId}`;
  return {
    root: base,
    dashboard: base,
    guests: `${base}/guests`,
    events: `${base}/events`,
    seating: `${base}/seating`,
    budget: `${base}/budget`,
    vendors: `${base}/vendors`,
    tasks: `${base}/tasks`,
    notes: `${base}/notes`,
    documents: `${base}/documents`,
    collaborators: `${base}/collaborators`,
    settings: `${base}/settings`,
    legacyExpenses: `${base}/expenses`,
    seatingPlan: (planId: string) => `${base}/seating/${planId}`,
  };
}

export function getEventRoutes(weddingId: string, eventId: string) {
  const wedding = getWeddingRoutes(weddingId);
  const base = `${wedding.events}/${eventId}`;
  return {
    root: base,
    overview: base,
    schedule: `${base}?tab=schedule`,
    guests: `${base}?tab=guests`,
    seating: `${base}?tab=seating`,
    notes: `${base}?tab=notes`,
  };
}
