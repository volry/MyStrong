import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { registerSW } from "virtual:pwa-register";
import { DataProvider } from "@/data/store";
import { router } from "./router";
import "./styles.css";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  </StrictMode>,
);
