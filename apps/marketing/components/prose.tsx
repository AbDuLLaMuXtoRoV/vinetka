import type { Block } from "@/lib/cms";

/** Renders CMS rich-text blocks with consistent typography. */
export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="grid gap-5 text-lg leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} className="mt-4 text-xl font-semibold">
                {b.text}
              </h2>
            );
          case "ul":
            return (
              <ul key={i} className="grid list-disc gap-2 pl-6 marker:text-muted">
                {b.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-4 border-accent pl-5 text-muted italic">
                {b.text}
              </blockquote>
            );
          default:
            return <p key={i}>{b.text}</p>;
        }
      })}
    </div>
  );
}
