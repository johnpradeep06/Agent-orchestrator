"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { RuleResult, Term } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = { pass: "#3ddc97", fail: "#ff6b7a", needs_human_review: "#ffb648" };
const STATUS_DOT: Record<string, string> = { pass: "bg-pass", fail: "bg-fail", needs_human_review: "bg-review" };

type Edge = { termIdx: number; ruleIdx: number; color: string };
type Point = { x: number; y: number };

export default function TermsRulesGraph({ terms, rules }: { terms: Term[]; rules: RuleResult[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ruleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<{ d: string; color: string; key: string }[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<{ side: "term" | "rule"; idx: number } | null>(null);

  // clause_id -> connections between the term(s) that cite it and the rule(s) whose evidence cites it
  const edges: Edge[] = [];
  terms.forEach((t, ti) => {
    if (!t.evidence.clause_id) return;
    rules.forEach((r, ri) => {
      if (r.evidence.some((e) => e.clause_id === t.evidence.clause_id)) {
        edges.push({ termIdx: ti, ruleIdx: ri, color: STATUS_COLOR[r.status] || "#565f7c" });
      }
    });
  });
  const connectedTermIdx = new Set(edges.map((e) => e.termIdx));
  const connectedRuleIdx = new Set(edges.map((e) => e.ruleIdx));
  const shownTerms = terms.map((t, i) => ({ t, i })).filter(({ i }) => connectedTermIdx.has(i));
  const shownRules = rules.map((r, i) => ({ r, i })).filter(({ i }) => connectedRuleIdx.has(i));

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      setDims({ w: cRect.width, h: cRect.height });

      const centerOf = (el: HTMLDivElement | null, side: "left" | "right"): Point | null => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: (side === "left" ? r.right : r.left) - cRect.left, y: r.top + r.height / 2 - cRect.top };
      };

      const next = edges
        .map((e) => {
          const p1 = centerOf(termRefs.current[e.termIdx], "left");
          const p2 = centerOf(ruleRefs.current[e.ruleIdx], "right");
          if (!p1 || !p2) return null;
          const mx = (p1.x + p2.x) / 2;
          return { d: `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`, color: e.color, key: `${e.termIdx}-${e.ruleIdx}` };
        })
        .filter(Boolean) as { d: string; color: string; key: string }[];
      setPaths(next);
    }
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms, rules]);

  if (shownTerms.length === 0 || shownRules.length === 0) {
    return <p className="text-sm text-muted">Not enough shared evidence to draw a graph for this run.</p>;
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted">
        Terms and compliance rules connected by shared clause citations — a line means that rule&apos;s
        evidence traces back to that extracted term&apos;s source clause. Line color follows the rule&apos;s outcome.
      </p>
      <div ref={containerRef} className="relative flex justify-between gap-24 rounded-xl border border-border bg-bg/40 p-6">
        <svg className="pointer-events-none absolute left-0 top-0" width={dims.w} height={dims.h} style={{ overflow: "visible" }}>
          {paths.map((p) => {
            const isDim =
              hovered &&
              !(
                (hovered.side === "term" && edges.some((e) => e.termIdx === hovered.idx && `${e.termIdx}-${e.ruleIdx}` === p.key)) ||
                (hovered.side === "rule" && edges.some((e) => e.ruleIdx === hovered.idx && `${e.termIdx}-${e.ruleIdx}` === p.key))
              );
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={isDim ? 1 : 2}
                opacity={isDim ? 0.12 : 0.75}
                style={{ transition: "opacity 0.15s, stroke-width 0.15s" }}
              />
            );
          })}
        </svg>

        <div className="relative z-10 flex flex-1 flex-col gap-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dim">Extracted Terms</p>
          {shownTerms.map(({ t, i }) => (
            <div
              key={i}
              ref={(el) => {
                termRefs.current[i] = el;
              }}
              onMouseEnter={() => setHovered({ side: "term", idx: i })}
              onMouseLeave={() => setHovered(null)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                hovered?.side === "term" && hovered.idx === i
                  ? "border-accent bg-accent/10 shadow-glow-accent"
                  : "border-border bg-surface hover:border-accent/40"
              }`}
            >
              <span className="font-medium text-ink">{t.name}</span>
              <span className="ml-1.5 text-dim">[{t.evidence.clause_id}]</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex flex-1 flex-col gap-2">
          <p className="mb-1 text-right text-[10px] font-semibold uppercase tracking-wide text-dim">Compliance Rules</p>
          {shownRules.map(({ r, i }) => (
            <div
              key={i}
              ref={(el) => {
                ruleRefs.current[i] = el;
              }}
              onMouseEnter={() => setHovered({ side: "rule", idx: i })}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-end gap-2 rounded-lg border px-3 py-1.5 text-right text-xs transition-all ${
                hovered?.side === "rule" && hovered.idx === i
                  ? "border-accent bg-accent/10 shadow-glow-accent"
                  : "border-border bg-surface hover:border-accent/40"
              }`}
            >
              <span className="font-mono text-dim">{r.rule_id}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] || "bg-dim"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
