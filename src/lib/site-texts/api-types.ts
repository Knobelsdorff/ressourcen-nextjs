/** Datenformen zwischen Admin-Editor und /api/admin/site-texts. */

export interface DraftRow {
  key: string;
  /** null = beim Veröffentlichen zurück auf das Original. */
  value: string | null;
  updatedAt: string;
  baseHash: string | null;
  /** E-Mail der Person, die den Entwurf zuletzt geändert hat (null = unbekannt). */
  updatedBy?: string | null;
}

export interface PublishedRow {
  key: string;
  value: string;
  updatedAt: string;
  baseHash: string | null;
}

export interface RevisionRow {
  id: number;
  key: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedBy: string | null;
}

export interface EditorStateResponse {
  drafts: DraftRow[];
  published: PublishedRow[];
}

export interface SaveDraftsRequest {
  set?: { key: string; value: string | null }[];
  discard?: string[];
}

export interface PublishResponse extends EditorStateResponse {
  results: { key: string; action: "published" | "reset" | "unchanged" }[];
}

export interface ApiError {
  error: string;
  code?: "missing-table" | "validation" | "unauthorized";
  details?: { key: string; errors: string[] }[];
}
