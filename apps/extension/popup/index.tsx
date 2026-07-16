import "@dealflow/ui/styles.css";
import { createRoot } from "react-dom/client";
import { Popup } from "./popup";

if (matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<Popup />);
