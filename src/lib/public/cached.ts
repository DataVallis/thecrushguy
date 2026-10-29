/**
 * Cached read functions for public pages (ADR-013): `use cache` + tags; admin saves call
 * updateTag("apps" | "app:<slug>" | "categories"). Call them only from request-time components (after
 * `connection()` or runtime params) — the Docker build has no database.
 */
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "@/lib/db/client";
import { loadCategoryPage, loadHomeData, loadPublishedApp } from "./catalog";

export async function getPublishedApp(slug: string) {
  "use cache";
  cacheTag("apps", `app:${slug}`, "categories");
  cacheLife("hours");
  return loadPublishedApp(sql(), slug);
}

export async function getCategoryPage(slug: string) {
  "use cache";
  cacheTag("apps", "categories", `category:${slug}`);
  cacheLife("hours");
  return loadCategoryPage(sql(), slug);
}

export async function getHomeData() {
  "use cache";
  cacheTag("apps", "categories");
  cacheLife("hours");
  return loadHomeData(sql());
}
