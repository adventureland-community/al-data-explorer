import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import axios from "axios";
import { GItem, ItemName, StatType } from "adventureland";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

function App() {
  const [G, setG] = useState<{ items?: { [T in ItemName]: GItem } }>({});

  useEffect(() => {
    axios
      .get("data.json")
      .then(function (response) {
        // handle success
        setG(response.data);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .then(function () {
        // always executed
      });
  });

  const statType: StatType[] = [
    "armor",
    "attack",
    "dex",
    "for",
    "frequency",
    "gold",
    "hp",
    "int",
    "lifesteal",
    "luck",
    "mp_cost",
    "range",
    "resistance",
    "speed",
    "str",
    "vit",
  ];
  // const columns = ["name", "g", ...statType];
  const columns = [
    {
      id: "name",
      numeric: false,
      label: "Name",
    },
    {
      id: "class",
      numeric: true,
      label: "Class",
      component: (x: string[]) => x ? x.join(",") : '',
    },
    {
      id: "type",
      numeric: true,
      label: "Type",
    },
    {
      id: "wtype",
      numeric: true,
      label: "W Type", // Merge with type?
    },
    {
      id: "tier",
      numeric: true,
      label: "Tier",
    },
    {
      id: "armor",
      numeric: true,
      label: "Armor",
    },
  ];
  // console.log(G.items);
  const rows = G.items
    ? Object.entries(G.items).map(([itemName, item]) => {
        const row = {
          itemName,
          ...item,
        };

        return row;
      })
    : [];

  return (
    <div className="App">
      {/* <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header> */}
      <TableContainer component={Paper}>
        <Table stickyHeader sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>itemName</TableCell>
              {columns.map((c) => {
                return (
                  <TableCell key={c.id} align={c.numeric ? "right" : "left"}>
                    {c.label}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.itemName}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {row.itemName}
                </TableCell>
                {columns.map((c) => {
                  const property = (row as any)[c.id];
                  return (
                    <TableCell key={row.itemName+c.id} align={c.numeric ? "right" : "left"}>
                      {c.component ? c.component(property) : property}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* <table style={{ width: "100%" }}>
        <tr>
          <th>name</th>
          {columns.map((c) => {
            return <td>{c}</td>;
          })}
        </tr>
        {G.items &&
          Object.entries(G.items).map(([itemName, item]) => {
            return (
              <tr key={itemName}>
                <td>{itemName}</td>
                {columns.map((c) => {
                  const property = (item as any)[c];
                  return <td>{property}</td>;
                })}
              </tr>
            );
          })}
      </table> */}
    </div>
  );
}

export default App;
