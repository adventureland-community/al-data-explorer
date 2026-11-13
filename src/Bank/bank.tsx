import { Link, Paper, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GDataContext } from "../GDataContext";
import { OwnerSelection } from "./OwnerSelection";
import { BankRender } from "./BankRender";

export function Bank() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerFromQuery = searchParams.get("owner") ?? "";
  const [selectedOwner, setSelectedOwner] = useState<string>(ownerFromQuery);

  useEffect(() => {
    if (ownerFromQuery && ownerFromQuery !== selectedOwner) {
      setSelectedOwner(ownerFromQuery);
    }
  }, [ownerFromQuery, selectedOwner]);

  const handleOwnerSelect = (owner: string) => {
    if (owner) {
      setSelectedOwner(owner);
      setSearchParams({ owner });
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
          . Matching WTS/WTB trade listings from ALData are shown in list view when available.
        </Typography>
        <OwnerSelection
          onChange={handleOwnerSelect}
          initialOwner={ownerFromQuery || selectedOwner}
        />
      </Paper>
      <BankRender ownerId={selectedOwner} />
    </>
  );
}
