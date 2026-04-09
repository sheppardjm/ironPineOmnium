import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ironpineomnium.com",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) =>
        page !== "https://ironpineomnium.com/submit-confirm/" &&
        page !== "https://ironpineomnium.com/error/",
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
