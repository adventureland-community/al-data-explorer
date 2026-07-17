import { Card, CardContent, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GDataContext } from "../GDataContext";
import { OwnerSelection } from "./OwnerSelection";
import { BankRender } from "./BankRender";

function Info() {
  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography component="div">
          This page shows bank data using the bank endpoint from{" "}
          <a href="https://aldata.earthiverse.ca">earthiverse&apos;s aldata</a>
          &nbsp;&nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/earthiverse/ALData?tab=readme-ov-file#authentication"
          >
            Get a api key{" "}
          </a>
          &nbsp;&nbsp;
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/earthiverse/ALData?tab=readme-ov-file#put-bankownerkey"
          >
            Push bank data
          </a>
          . Matching WTS/WTB trade listings from ALData are shown when available (read-only).
        </Typography>
      </CardContent>
    </Card>
  );
}

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
    console.log("Handle owner select: ", owner);
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
      <Info />
      <OwnerSelection onChange={handleOwnerSelect} initialOwner={ownerFromQuery || selectedOwner} />
      <BankRender ownerId={selectedOwner} />
    </>
  );
}
