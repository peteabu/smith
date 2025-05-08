import { createRoot } from "react-dom/client";
import App from "./App";
import { Helmet, HelmetProvider } from "react-helmet-async";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <Helmet>
      <title>CV Optimizer - ATS-friendly resume builder</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
      <meta name="description" content="Transform your resume with our minimalist CV optimization tool. Analyze job descriptions and tailor your CV to match ATS keywords with an elegant typewriter-style interface." />
      <meta property="og:title" content="CV Optimizer - ATS-friendly resume builder" />
      <meta property="og:description" content="Transform your resume with our minimalist CV optimization tool. Analyze job descriptions and tailor your CV to match ATS keywords." />
      <meta property="og:type" content="website" />
    </Helmet>
    <App />
  </HelmetProvider>
);
