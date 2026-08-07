"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ProseNode } from "./content/glossaryMatch";
import type { GlossaryEntry } from "./content/types";

const PANEL_WIDTH = 320;
const VIEWPORT_MARGIN = 12;

/**
 * A glossary term marked in place, with its definition one hover, focus or tap
 * away.
 *
 * The trigger is a real `<button>` rather than a styled span, which is what
 * makes this work without a mouse: it is tabbable, it fires on tap, and screen
 * readers announce it. WCAG 1.4.13 asks that content shown on hover be
 * dismissible, hoverable and persistent — so Escape closes it, nothing closes
 * on a timer, and the panel stays a DOM child of the hovered wrapper. That last
 * detail is what lets the pointer travel from the term onto the definition:
 * `mouseleave` does not fire while the pointer is over a descendant, however
 * that descendant is positioned.
 *
 * The panel is positioned `fixed` rather than `absolute` because
 * `.topic-section` sets `overflow: hidden`; an absolutely positioned panel
 * would be clipped at the section edge, which is the same class of bug as the
 * diagram labels that were being cut off by their viewBox.
 */
export function GlossaryTermMark({ entry, children }: { entry: GlossaryEntry; children: string }) {
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = `glossary-${useId().replace(/:/g, "")}`;
  const open = anchor !== null;

  const show = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    setAnchor({
      top: rect.bottom,
      left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)),
      width,
    });
  }, []);

  const hide = useCallback(() => setAnchor(null), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    // Fixed coordinates are captured once, so a scroll would leave the panel
    // stranded. Closing is the honest response, and matches what a reader
    // scrolling away expects anyway.
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  return (
    <span className="glossary-mark-wrap" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={trigger}
        type="button"
        className="glossary-mark"
        aria-describedby={open ? panelId : undefined}
        onFocus={show}
        onBlur={hide}
        onClick={() => (open ? hide() : show())}
      >
        {children}
      </button>
      {anchor ? (
        <span
          className="glossary-pop"
          id={panelId}
          role="tooltip"
          style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
        >
          <span className="glossary-pop-card">
            <strong>{entry.term}</strong>
            {entry.expansion ? <em>{entry.expansion}</em> : null}
            <span>{entry.definition}</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** Renders one string already split into plain and term-bearing nodes. */
export function Prose({ nodes }: { nodes: ProseNode[] }) {
  return (
    <>
      {nodes.map((node, index) =>
        node.kind === "text" ? (
          <Fragment key={index}>{node.text}</Fragment>
        ) : (
          <GlossaryTermMark key={index} entry={node.entry}>{node.text}</GlossaryTermMark>
        ),
      )}
    </>
  );
}
