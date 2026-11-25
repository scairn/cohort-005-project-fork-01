import { db } from "~/db";
import type { Db } from "./lib/db";
import { getLandingOverview } from "./lib/overview";

export { FEATURED_COURSE_COUNT } from "./lib/overview";
export type {
  CatalogueStats,
  FeaturedCourse,
  LandingOverview,
} from "./lib/overview";

/**
 * The data behind the landing page (`/`), bound to a database. The route
 * uses `landingPage`; tests build their own against a test database.
 */
export function createLandingPage(database: Db) {
  return {
    overview: () => getLandingOverview(database),
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const landingPage = /* @__PURE__ */ createLandingPage(db);
