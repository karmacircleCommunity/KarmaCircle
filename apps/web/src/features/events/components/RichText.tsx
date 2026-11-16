import { Fragment } from "react";
import { parseRichText } from "@features/events/utils/richText";
import type { InlineNode } from "@features/events/utils/richText";

const linkClasses =
  "font-medium text-brand underline underline-offset-4 transition-colors hover:text-brand-hover";

const Inline = ({ nodes }: { nodes: InlineNode[] }) => (
  <>
    {nodes.map((node, index) => {
      switch (node.type) {
        case "bold":
          return (
            <strong key={index} className="font-semibold text-brand-secondary">
              {node.text}
            </strong>
          );
        case "italic":
          return <em key={index}>{node.text}</em>;
        case "link":
          return (
            <a
              key={index}
              href={node.href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className={linkClasses}
            >
              {node.text}
            </a>
          );
        default:
          return <Fragment key={index}>{node.text}</Fragment>;
      }
    })}
  </>
);

interface RichTextProps {
  /** One string per paragraph, as the API stores `about`. */
  paragraphs: readonly string[];
  /** Classes for each paragraph and list, so the caller sets the type scale. */
  className?: string;
}

/**
 * An event's full write-up with the small formatting set from
 * `utils/richText.ts` (PG-12): bold, italic, http(s) links, bullet and numbered
 * lists. It builds React elements from parsed data, never HTML, so organizer text
 * cannot inject markup. Each stored paragraph gets `data-reveal` like the plain
 * paragraphs it replaced.
 */
const RichText = ({ paragraphs, className = "" }: RichTextProps) => (
  <>
    {parseRichText(paragraphs).map((blocks, paragraphIndex) => (
      <div key={paragraphIndex} data-reveal className="mt-4 first:mt-0">
        {blocks.map((block, blockIndex) => {
          const spacing = blockIndex === 0 ? "" : "mt-3";
          if (block.type === "bulletList" || block.type === "numberedList") {
            const List = block.type === "bulletList" ? "ul" : "ol";
            return (
              <List
                key={blockIndex}
                className={`m-0 ${block.type === "bulletList" ? "list-disc" : "list-decimal"} pl-6 marker:text-brand ${spacing} ${className}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="mt-1 first:mt-0">
                    <Inline nodes={item} />
                  </li>
                ))}
              </List>
            );
          }
          return (
            <p key={blockIndex} className={`m-0 ${spacing} ${className}`}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  <Inline nodes={line} />
                </Fragment>
              ))}
            </p>
          );
        })}
      </div>
    ))}
  </>
);

export default RichText;
