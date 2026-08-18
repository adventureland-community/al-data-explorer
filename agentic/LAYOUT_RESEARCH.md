# World map layout — research notes

## Problem

Adventure Land maps are **large rectangles** (often 2000–8000 px) connected by **doors** (ports).
Many maps share a logical layer (overworld, indoor floor, dungeon depth) but cannot share the
same `(x, y)` without art overlap.

## Useful algorithms (web / literature)

| Approach | Used by | Fits our case |
|----------|---------|----------------|
| **Sugiyama layered layout** | Graphviz `dot`, ELK Layered, yFiles | Z = layer, door = port constraint |
| **Size-aware node placement** | ELK (`nodeSize`, spacing options), Rüegg et al. | Pass art width/height as node size |
| **Rectangle packing** | ELK disconnected packing | Island components, no door edges |
| **Force/stress layout** | ELK Force, D3 force | Global shape; weak door fidelity |
| **Constraint overlap removal** | PRISM, cola.js | Push rectangles apart after initial embed |

References:

- [Eclipse Layout Kernel (ELK)](https://eclipse.dev/elk/) — layered, packing, force; node dimensions + spacing
- [Sugiyama et al. layered drawing](https://en.wikipedia.org/wiki/Layered_graph_drawing)

## Current pipeline (algorithmic)

1. **Layer assignment (Z)** — band + dungeon depth via door graph (`pickLayerZ`)
2. **Door embedding (XY)** — BFS from `main`; child pose = parent + door − spawn
3. **Port lock** — sequential dungeon descent + band/indoor entry lock XY (`isDoorStackPin`)
4. **Port realign** — snap port-locked maps to their parent doors (`doorLayout.ts`)
5. **Slab compaction (XY)** — on **each Z**, push movable maps apart (art bounds + gap). Same-depth
   dungeon branches (level2n, level2w) spread horizontally; overworld maps spread on z=0.
6. **Realign + slab loop** — after parents move, re-sync children and re-run slabs (3 passes)
7. **Z micro-steps** — port-locked indoor/underground footprints that still overlap get +120px Z

No manual map list or JSON overrides.

## Future options

- Integrate **elkjs** for port-aware layered layout within each Z slab
- **Cluster separation** — move entire door subtrees as rigid units on overworld slabs
- Evaluate force layout for disconnected island components only
