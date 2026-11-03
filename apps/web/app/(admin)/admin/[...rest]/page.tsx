import { notFound } from "next/navigation";

/** Any unmatched path under /admin renders the admin area's own 404 page. */
export default function CatchAll() {
  notFound();
}
