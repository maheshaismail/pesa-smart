import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize background sync for offline transactions
import './lib/sync';

createRoot(document.getElementById("root")!).render(<App />);
