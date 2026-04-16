// checkOwnership.js — ownership is handled at the database layer.
// This middleware is kept as a no-op stub so potential old references don't break.
// Ownership is now baked into the database.js functions via owner_id filters.
export function checkOwnership() {
  return (req, res, next) => next();
}
