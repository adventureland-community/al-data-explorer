import { Box } from "@mui/material";
import katex from "katex";
import "katex/dist/katex.min.css";

export type MathTeXProps = {
  /** LaTeX math (no surrounding `$`). Prefer `\begin{aligned}...\end{aligned}` for multi-line. */
  tex: string;
  /** Display (block) vs inline. Default true. */
  display?: boolean;
};

/** Wrap lines as a left-aligned KaTeX `aligned` block with extra row gap. */
export function alignedTex(lines: string[]): string {
  return `\\begin{aligned}\n${lines.join(" \\\\[0.45em]\n")}\n\\end{aligned}`;
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
        overflowY: "visible",
        textAlign: "left",
        // Dark UI + KaTeX's thin Computer Modern reads soft; bump size and smooth.
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        "& .katex": {
          color: "inherit",
          fontSize: display ? "1.35em" : "1.1em",
          lineHeight: 1.65,
        },
        "& .katex-display": {
          margin: "0.35em 0",
          textAlign: "left",
        },
        "& .katex-display > .katex": {
          textAlign: "left",
        },
        // Prefer upright roman for identifiers we mark with \mathrm.
        "& .katex .mathrm": {
          fontStyle: "normal",
          fontWeight: 600,
        },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
