/**
 * Escape special characters in search terms for use with Supabase .or() filters.
 * Characters that are special in PostgREST filter syntax: ( ) , . %
 * Also escapes backslash and single-quote for LIKE patterns.
 */
export function escapeSearchTerm(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/[(),]/g, "");
}
