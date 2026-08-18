import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import App, { FullBleedLayout, StandardLayout } from "./App";
import { GearPlanner } from "./GearPlanner/GearPlanner";
import { Market } from "./Market/Market";
import { Monsters } from "./Monster/monsters";
import { Bank } from "./Bank/bank";
import { Welcome } from "./Welcome";
import { WorldViewer } from "./WorldViewer/WorldViewer";

// TODO: https://reactrouter.com/en/main/start/tutorial#handling-not-found-errors

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        element: <StandardLayout />,
        children: [
          {
            index: true,
            element: <Welcome />,
          },
          {
            path: "monsters",
            element: <Monsters />,
          },
          {
            path: "gear",
            element: <GearPlanner />,
          },
          {
            path: "market",
            element: <Market />,
          },
          {
            path: "bank",
            element: <Bank />,
          },
        ],
      },
      {
        element: <FullBleedLayout />,
        children: [
          {
            path: "world",
            element: <WorldViewer />,
          },
        ],
      },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
