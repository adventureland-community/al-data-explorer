import { Link, Paper, Typography } from "@mui/material";
import { useContext, useState } from "react";
import { GDataContext } from "../GDataContext";
import { OwnerSelection } from "./OwnerSelection";
import { BankRender } from "./BankRender";

export function Bank() {
  const [selectedOwner, setSelectedOwner] = useState<string>("");

  const handleOwnerSelect = (owner: string) => {
    if (owner) {
      setSelectedOwner(owner);
    }
  };

  const G = useContext(GDataContext);

  if (!G) {
    return <>WAITING!</>;
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Bank data from{" "}
          <Link href="https://aldata.earthiverse.ca" target="_blank" rel="noreferrer">
            earthiverse aldata
          </Link>
          {" · "}
          <Link
            href="https://github.com/earthiverse/ALData?tab=readme-ov-file#authentication"
            target="_blank"
            rel="noreferrer"
          >
            Get API key
          </Link>
          {" · "}
          <Link
            href="https://github.com/earthiverse/ALData?tab=readme-ov-file#put-bankownerkey"
            target="_blank"
            rel="noreferrer"
          >
            Push bank data
          </Link>
        </Typography>
        <OwnerSelection onChange={handleOwnerSelect} />
      </Paper>
      <BankRender ownerId={selectedOwner} />
    </>
  );
}
