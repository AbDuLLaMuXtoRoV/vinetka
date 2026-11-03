import { notFound } from "next/navigation";

/** Any unmatched path under /studio renders the studio area's own 404 page. */
export default function CatchAll() {
  notFound();
}
