import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import {
  ItemInfo,
  MapName,
  ServerIdentifier,
  ServerRegion,
  TradeSlotType,
} from "adventureland";
import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { GDataContext } from "../GDataContext";

export function Market() {
  const G = useContext(GDataContext);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  console.log("market redraw");
  useEffect(() => {
    // TODO: should probably cache this somehow, perhaps track diffs in localstorage?
    // or build a database or something.
    if (merchants.length <= 0) {
      console.log("fetching data");
      axios
        .get("https://aldata.earthiverse.ca/merchants")
        .then(function (response) {
          // handle success
          setMerchants(response.data);
        })
        .catch(function (error) {
          // handle error
          console.log(error);
        })
        .then(function () {
          // always executed
        });
    }
  });
  // TODO: a search, filtering everything by search
  // TODO: should we group items by merchant, or should we group it differently?
  // TODO: let's just recreate the marketplace as an initial attempt

  // TODO: group by filter?
  return (
    <>
      {merchants.map((merchant) => {
        return (
          <div key={merchant.id}>
            <span>{merchant.id}</span>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(merchant.slots).map(([slot, item]) => {
                  const gItem = G?.items[item.name];
                  const price = item.price; // TODO: pretty print
                  return (
                    <TableRow key={merchant.id + slot}>
                      <TableCell></TableCell>
                      <TableCell>
                        {item.level ? "+" + item.level : ""} {gItem?.name} (
                        {item.name})
                      </TableCell>
                      <TableCell>{price}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </>
  );
}

type Merchant = {
  /** name of the merchant */
  id: string;
  lastSeen: Date;
  map: MapName;
  serverIdentifier: ServerIdentifier;
  serverRegion: ServerRegion;
  slots: { [T in TradeSlotType]: ItemInfo };
  x: number;
  y: number;
};
