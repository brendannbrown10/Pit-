import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Fully static output. The gallery and admin pages talk to Supabase
// directly from the browser, so no server adapter is needed.
export default defineConfig({
  integrations: [react()],
});
