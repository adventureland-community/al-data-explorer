import { Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { CLASS_COLOR } from "../constants";
import { SavedLoadouts, SavedLoadout } from "./types";

export function SavedLoadoutTable({
  loadouts,
  onSelectLoadout,
}: {
  loadouts: SavedLoadouts;
  onSelectLoadout: (name: string, data: SavedLoadout) => void;
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Level</TableCell>
          <TableCell>Class</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(loadouts).map(([key, data]) => {
          const classColor = data.classKey ? CLASS_COLOR[data.classKey] : "primary";

          // console.log(key, data, classColor, CLASS_COLOR);
          return (
            <TableRow
              hover
              key={key}
              onClick={() => onSelectLoadout(key, data)}
              sx={{
                cursor: "pointer",
              }}
            >
              <TableCell sx={{ color: classColor }}>{key}</TableCell>
              <TableCell sx={{ color: classColor }}>{data.level}</TableCell>
              <TableCell sx={{ color: classColor }}>
                {data.classKey?.slice(0, 1).toUpperCase()}
                {data.classKey?.slice(1)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
