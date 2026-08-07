import type { ArchitectureDiagram, DiagramEdge } from "./types";

/**
 * Grid-to-pixel layout for the reference architecture diagrams.
 *
 * This lives outside the renderer so the authoring control can check the same
 * geometry the browser will draw. The defect that prompted the split: the
 * viewBox height was computed from the node grid alone, while backward edges
 * bow *below* the grid and hang their label under the bow. An SVG root clips to
 * its viewBox by default, so 18 labels across 11 diagrams were silently dropped
 * — and they were the feedback and label-maturation edges, the ones carrying
 * the point. Nothing caught it because both guards checked strings, not pixels.
 */

export const NODE_W = 158;
export const NODE_H = 58;
export const COL_GAP = 92;
export const ROW_GAP = 28;
export const DIAGRAM_PAD = 10;
/** Room below an edge label's baseline for its descenders. */
export const LABEL_DESCENT = 6;

export const nodeX = (col: number) => DIAGRAM_PAD + col * (NODE_W + COL_GAP);
export const nodeY = (row: number) => DIAGRAM_PAD + row * (NODE_H + ROW_GAP);

export type EdgePath = {
  edge: DiagramEdge;
  /** SVG path data. */
  d: string;
  /** Where the edge's label is anchored. */
  mid: { x: number; y: number };
};

export type DiagramLayout = {
  width: number;
  height: number;
  paths: EdgePath[];
};

export function computeDiagramLayout(diagram: ArchitectureDiagram): DiagramLayout {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const cols = Math.max(...diagram.nodes.map((node) => node.col)) + 1;
  const rows = Math.max(...diagram.nodes.map((node) => node.row)) + 1;
  const width = DIAGRAM_PAD * 2 + cols * NODE_W + (cols - 1) * COL_GAP;
  const gridHeight = DIAGRAM_PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP;

  const paths = diagram.edges.flatMap<EdgePath>((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return [];
    const fx = nodeX(from.col);
    const fy = nodeY(from.row);
    const tx = nodeX(to.col);
    const ty = nodeY(to.row);
    let d: string;
    let mid: { x: number; y: number };

    if (from.col === to.col) {
      const down = to.row > from.row;
      const x = fx + NODE_W / 2;
      const y1 = down ? fy + NODE_H : fy;
      const y2 = down ? ty : ty + NODE_H;
      d = `M ${x} ${y1} L ${x} ${y2}`;
      mid = { x, y: (y1 + y2) / 2 };
    } else if (to.col > from.col) {
      const x1 = fx + NODE_W;
      const y1 = fy + NODE_H / 2;
      const x2 = tx;
      const y2 = ty + NODE_H / 2;
      const dx = Math.max(24, (x2 - x1) / 2);
      d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 7 };
    } else {
      // Backward edge: drop below both boxes and return.
      const x1 = fx + NODE_W / 2;
      const y1 = fy + NODE_H;
      const x2 = tx + NODE_W / 2;
      const y2 = ty + NODE_H;
      const dip = Math.max(y1, y2) + ROW_GAP * 0.8;
      d = `M ${x1} ${y1} C ${x1} ${dip}, ${x2} ${dip}, ${x2} ${y2}`;
      mid = { x: (x1 + x2) / 2, y: dip + 4 };
    }
    return [{ edge, d, mid }];
  });

  // Size the canvas to what actually got drawn, not to the node grid.
  const lowestMark = paths.reduce((low, path) => Math.max(low, path.mid.y), 0);
  const height = Math.max(gridHeight, lowestMark + LABEL_DESCENT + DIAGRAM_PAD);

  return { width, height, paths };
}
