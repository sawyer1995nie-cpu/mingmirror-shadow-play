import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./shadow.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
