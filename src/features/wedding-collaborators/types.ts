export type WeddingRole = "owner" | "editor" | "viewer";

export type WeddingAccess = {
  role: WeddingRole;
  canEdit: boolean;
  canManageMembers: boolean;
  canDeleteWedding: boolean;
};

export type WeddingCollaborator = {
  id: string;
  weddingId: string;
  userId: string;
  role: WeddingRole;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type SearchableUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};
