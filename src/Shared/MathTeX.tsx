import { Box } from "@mui/material";
import katex from "katex";
import "katex/dist/katex.min.css";

export type MathTeXProps = {
  /** LaTeX math (no surrounding `$`). */
  tex: string;
  /** Display (block) vs inline. Default true. */
  display?: boolean;
};

/** Renders one LaTeX expression with KaTeX. */
export function MathTeX({ tex, display = true }: MathTeXProps) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
  });
  return (
    <Box
      component={display ? "div" : "span"}
      sx={{
        color: "text.primary",
        overflowX: "auto",
        "& .katex": { color: "inherit", fontSize: display ? "1.05em" : "1em" },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
