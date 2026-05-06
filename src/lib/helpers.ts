import type { Location } from '@/types';

/**
 * Build full hierarchical path string for a location.
 * Example output: "A1 > B2 > C3"
 *
 * @param loc - The location to display (with parent chain resolved to its root)
 * @param allLocations - Flat list of ALL locations (needed if loc doesn't have parent chain resolved)
 * @returns Full path string like "A1 > B2 > C3", or fallback to "loc.code"
 */
export function getLocationPath(loc: Location | null | undefined, allLocations?: Location[]): string {
  if (!loc) return '未定位';

  // First try: if loc has a resolved parent chain (loc.parent is a Location object)
  const chain = buildChain(loc, allLocations);
  return chain.map(l => l.code).join(' > ');
}

/**
 * Build the ancestor chain from root to the given location.
 * Uses the parent chain of the location object if available, otherwise falls back to allLocations map.
 */
function buildChain(loc: Location, allLocations?: Location[]): Location[] {
  const chain: Location[] = [];
  const visited = new Set<string>();

  // Walk up to root using the location's parent references
  let current: Location | undefined = loc;
  while (current && !visited.has(current.id)) {
    chain.unshift(current);
    visited.add(current.id);

    // Try to get parent from the resolved object
    const parent = (current as any)['parent'] as Location | undefined | null;
    if (parent && typeof parent === 'object' && parent.id) {
      current = parent;
      continue;
    }

    // Fallback: look up parent from allLocations map
    if (allLocations && current.parent_id) {
      const found = allLocations.find(l => l.id === current!.parent_id);
      current = found;
      continue;
    }

    break;
  }

  return chain;
}