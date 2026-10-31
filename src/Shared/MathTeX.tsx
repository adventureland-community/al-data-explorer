import { Box } from "@mui/material";
import katex from "katex";
import "katex/dist/katex.min.css";

export type MathTeXProps = {
  /** LaTeX math (no surrounding `$`). Prefer `\begin{aligned}...\end{aligned}` for multi-line. */
  tex: string;
  /** Display (block) vs inline. Default true. */
  display?: boolean;
};

/** Wrap lines as a left-aligned KaTeX `aligned` block. */
export function alignedTex(lines: string[]): string {
  return `\\begin{aligned}\n${lines.join(" \\\\\n")}\n\\end{aligned}`;
}

/** Renders one LaTeX expression with KaTeX. */
export function MathTeX({ tex, display = true }: MathTeXProps) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    trust: true,
  });
  return (
    <Box
      component={display ? "div" : "span"}
      sx={{
        color: "text.primary",
        overflowX: "auto",
        textAlign: "left",
        "& .katex": {
          color: "inherit",
          fontSize: display ? "1.15em" : "1em",
        },
        "& .katex-display": {
          margin: "0.15em 0",
          textAlign: "left",
        },
        "& .katex-display > .katex": {
          textAlign: "left",
        },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
