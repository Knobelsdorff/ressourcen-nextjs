/*
 * Rendert Katalog-Texte als React-Knoten. Ohne "use client", ohne Hooks:
 * funktioniert in Server- und Client-Komponenten.
 *
 * Variablen werden erst NACH dem Zerlegen der Auszeichnung eingesetzt, damit
 * ein Wert wie eine E-Mail-Adresse mit "**" nichts verändert.
 */

import { Fragment, type ReactNode } from "react";
import type { TextFormat } from "./define";
import { interpolate, isExternalHref, parseBlocks, parseInline, type InlineNode, type TextVars } from "./format";

export type BlockClassNames = Partial<Record<"h2" | "h3" | "p" | "ul" | "ol" | "li" | "a" | "strong", string>>;

function withBreaks(text: string, keyPrefix: string): ReactNode {
  if (!text.includes("\n")) return text;
  const parts = text.split("\n");
  return parts.map((part, i) => (
    <Fragment key={`${keyPrefix}-${i}`}>
      {i > 0 && <br />}
      {part}
    </Fragment>
  ));
}

function renderInlineNodes(nodes: InlineNode[], vars: TextVars | undefined, cls: BlockClassNames, keyPrefix: string): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "text") return <Fragment key={key}>{withBreaks(interpolate(node.value, vars), key)}</Fragment>;
    if (node.type === "bold") {
      return (
        <strong key={key} className={cls.strong}>
          {renderInlineNodes(node.children, vars, cls, key)}
        </strong>
      );
    }
    const external = isExternalHref(node.href);
    return (
      <a
        key={key}
        href={node.href}
        className={cls.a}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {renderInlineNodes(node.children, vars, cls, key)}
      </a>
    );
  });
}

export function renderInline(text: string, vars?: TextVars, cls: BlockClassNames = {}): ReactNode {
  return renderInlineNodes(parseInline(text), vars, cls, "i");
}

export function renderBlocks(text: string, vars?: TextVars, cls: BlockClassNames = {}): ReactNode {
  return parseBlocks(text).map((block, i) => {
    const key = `b-${i}`;
    switch (block.type) {
      case "h2":
        return <h2 key={key} className={cls.h2}>{renderInline(block.text, vars, cls)}</h2>;
      case "h3":
        return <h3 key={key} className={cls.h3}>{renderInline(block.text, vars, cls)}</h3>;
      case "p":
        return (
          <p key={key} className={cls.p}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line, vars, cls)}
              </Fragment>
            ))}
          </p>
        );
      default: {
        const Tag = block.type;
        return (
          <Tag key={key} className={cls[block.type]}>
            {block.items.map((item, j) => (
              <li key={j} className={cls.li}>{renderInline(item, vars, cls)}</li>
            ))}
          </Tag>
        );
      }
    }
  });
}

/** Ein Text im Fließtext: plain = nur Zeilenumbrüche, inline = fett + Links. */
export function renderText(text: string, format: TextFormat, vars?: TextVars, cls?: BlockClassNames): ReactNode {
  if (format === "plain") return withBreaks(interpolate(text, vars), "t");
  if (format === "inline") return renderInline(text, vars, cls);
  return renderBlocks(text, vars, cls);
}
