import { DoorConnection } from "./types";

/**
 * BFS shortest path over the door graph.
 * Returns the ordered list of map IDs from `from` to `to`, or null if unreachable.
 */
export function findShortestPath(
  from: string,
  to: string,
  connections: DoorConnection[],
): string[] | null {
  if (from === to) {
    return [from];
  }

  const adj = new Map<string, Set<string>>();
  const touch = (a: string, b: string) => {
    if (!adj.has(a)) {
      adj.set(a, new Set());
    }
    adj.get(a)!.add(b);
  };
  for (const edge of connections) {
    touch(edge.fromMap, edge.toMap);
    if (edge.twoWay) {
      touch(edge.toMap, edge.fromMap);
    }
  }

  if (!adj.has(from)) {
    return null;
  }

  const parent = new Map<string, string>();
  parent.set(from, from);
  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adj.get(current) ?? []) {
      if (parent.has(neighbor)) {
        continue;
      }
      parent.set(neighbor, current);
      if (neighbor === to) {
        const path: string[] = [];
        let node = to;
        while (node !== from) {
          path.push(node);
          node = parent.get(node)!;
        }
        path.push(from);
        path.reverse();
        return path;
      }
      queue.push(neighbor);
    }
  }

  return null;
}
