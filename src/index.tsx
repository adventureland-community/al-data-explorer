import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { createBrowserRouter, RouterProvider, Route } from "react-router-dom";
import { GearPlanner } from "./GearPlanner/GearPlanner";
import { Market } from "./Market/Market";
import { Monsters } from "./Monster/monsters";

// TODO: https://reactrouter.com/en/main/start/tutorial#handling-not-found-errors

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: 'monsters',
        element: <Monsters />
      },
      {
        path: "gear",
        element: <GearPlanner />,
      },
      {
        path: "market",
        element: <Market />,
      },
    ],
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
