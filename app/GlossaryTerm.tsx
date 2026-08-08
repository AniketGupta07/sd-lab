"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ProseNode } from "./content/glossaryMatch";
import type { GlossaryEntry } from "./content/types";

const PANEL_WIDTH = 320;
const VIEWPORT_MARGIN = 12;
/** Enough of a guess to decide which side has room; exact height is unknown pre-paint. */
const ESTIMATED_PANEL_HEIGHT = 160;

type Anchor = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  flipped: boolean;
};

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
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  /**
   * When the last pointer press happened, so focus can tell a Tab from a tap.
   * `:focus-visible` looks like the right tool and is not: at the moment the
   * focus handler runs it does not yet reliably report true for keyboard focus,
   * which left the definition unopenable by keyboard.
   */
  const pointerDownAt = useRef(0);
  const panelId = `glossary-${useId().replace(/:/g, "")}`;
  const open = anchor !== null;

  /**
   * Anchor the panel to the term, flipping above it when there is not enough
   * room below. Without the flip, tapping a term near the bottom of a phone
   * screen opened the definition entirely below the fold — the panel was
   * technically open and completely unreadable.
   */
  const measure = useCallback((): Anchor | null => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return null;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const below = window.innerHeight - rect.bottom;
    const flip = below < ESTIMATED_PANEL_HEIGHT && rect.top > below;
    return {
      top: flip ? undefined : rect.bottom,
      bottom: flip ? window.innerHeight - rect.top : undefined,
      left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)),
      width,
      flipped: flip,
    };
  }, []);

  const show = useCallback(() => {
    const next = measure();
    if (next) setAnchor(next);
  }, [measure]);

  const hide = useCallback(() => setAnchor(null), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    // Fixed coordinates are measured once, so the panel has to follow its term
    // on scroll. Closing instead looks simpler and is wrong: tabbing to a term
    // that is off-screen makes the browser scroll it into view, which fired the
    // close handler the instant focus opened the panel and made the whole
    // feature unreachable by keyboard.
    let frame = 0;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Deliberately no "close when off-screen" branch. Tabbing to a term
        // below the fold fires focus *before* the browser scrolls it into view,
        // so an off-screen test here sees stale coordinates and closes the
        // panel it was meant to be following.
        const next = measure();
        if (next) setAnchor(next);
      });
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, hide, measure]);

  return (
    // Hover opens only for an actual mouse. A tap synthesises
    // pointerenter -> focus -> click, so reacting to the first two would open
    // the panel and then let the click toggle it straight back shut — which is
    // exactly what happened before this guard, leaving the feature dead on
    // touch. Ignoring non-mouse pointers hands touch entirely to onClick.
    <span
      className="glossary-mark-wrap"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") hide(); }}
    >
      <button
        ref={trigger}
        type="button"
        className="glossary-mark"
        aria-describedby={open ? panelId : undefined}
        onPointerDown={() => { pointerDownAt.current = Date.now(); }}
        // Same reasoning as the hover guard: a tap focuses the button, and only
        // keyboard focus should reveal the definition by itself. A focus that
        // did not follow a pointer press is a Tab.
        onFocus={() => { if (Date.now() - pointerDownAt.current > 300) show(); }}
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
          style={{ top: anchor.top, bottom: anchor.bottom, left: anchor.left, width: anchor.width }}
          data-flipped={anchor.flipped || undefined}
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
