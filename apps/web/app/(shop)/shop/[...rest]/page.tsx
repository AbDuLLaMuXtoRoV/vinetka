import { notFound } from "next/navigation";

/** Any unmatched path under /shop renders the shop area's own 404 page. */
export default function CatchAll() {
  notFound();
}
