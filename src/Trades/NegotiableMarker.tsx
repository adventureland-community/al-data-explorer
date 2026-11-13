import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import { Tooltip } from "@mui/material";

/** Compact marker for price/ratio flexibility. Tooltip explains meaning. */
export function NegotiableMarker({
  title = "Negotiable",
  fontSize = 14,
}: {
  title?: string;
  fontSize?: number;
}) {
  return (
    <Tooltip title={title} placement="top">
      <HandshakeOutlinedIcon
        aria-label={title}
        sx={{
          fontSize,
          color: "text.secondary",
          verticalAlign: "middle",
          display: "inline-block",
        }}
      />
    </Tooltip>
  );
}
