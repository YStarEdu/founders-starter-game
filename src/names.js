// Checks a player's name before it goes on the leaderboard. The database checks the same rules again
// (supabase/setup.sql), because anyone can skip the game and send a score straight to the database.

export const NAME_LENGTH = 12;
export const MAX_SCORE = 100000; // the highest score the leaderboard accepts (setup.sql has the same limit)

// Letters (including accented ones like é and ç), numbers and spaces.
const NAME_PATTERN = /^[A-Za-z0-9À-ÖØ-öø-ÿ ]+$/;

// Tidies what the player typed: no spaces at the ends, no double spaces.
export function cleanName(text) {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

// Returns a message saying what's wrong, or null if the name is fine.
export function nameProblem(name) {
  if (name.length === 0) return "Type a name first.";
  if (name.length > NAME_LENGTH) return `Use ${NAME_LENGTH} characters or fewer.`;
  if (!NAME_PATTERN.test(name)) return "Use only letters, numbers and spaces.";
  return null;
}
