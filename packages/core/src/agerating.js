/**
 * Age Rating / Kids Mode definitions.
 *
 * When enabled, generates an ESE that filters streams by TMDB certification.
 * Requires a TMDB key for certification data.
 */

export const AGE_RATINGS = [
  { v: 'none',  label: 'None (Unrestricted)', desc: 'No age filtering — show all content' },
  { v: 'G',     label: 'G — General',         desc: 'All ages — very mild content only' },
  { v: 'PG',    label: 'PG — Parental Guidance', desc: 'Some material may not be suitable for young children' },
  { v: 'PG-13', label: 'PG-13',               desc: 'Some material may be inappropriate for children under 13' },
  { v: 'R',     label: 'R — Restricted',       desc: 'Under 17 requires accompanying parent — most streaming content' },
  { v: 'NC-17', label: 'NC-17 — Adults Only', desc: 'No age filtering applied — all content including adult titles will appear' },
];

export const AGE_RATING_CERTIFICATIONS = {
  'G':     ['G', 'TV-G', 'TV-Y', 'TV-Y7'],
  'PG':    ['G', 'PG', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-PG'],
  'PG-13': ['G', 'PG', 'PG-13', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-PG', 'TV-14'],
  'R':     ['G', 'PG', 'PG-13', 'R', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-PG', 'TV-14', 'TV-MA'],
};

/**
 * Generate an ESE for age rating filtering.
 * @param {string} rating - One of the AGE_RATINGS values
 * @returns {{ enabled: boolean, expression: string } | null}
 */
export function generateAgeRatingESE(rating) {
  if (!rating || rating === 'none' || rating === 'NC-17') return null;

  const certs = AGE_RATING_CERTIFICATIONS[rating];
  if (!certs) return null;

  const certList = certs.map(c => `'${c}'`).join(', ');
  return {
    enabled: true,
    expression: `/* Age Rating: max ${rating} */ certification(streams, ${certList})`,
  };
}
