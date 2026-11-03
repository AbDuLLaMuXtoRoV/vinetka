import { notFound } from "next/navigation";

/** Any unmatched path under a locale renders that locale's 404 page. */
export default function CatchAll() {
  notFound();
}
