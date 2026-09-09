"""CLI entrypoint for local runs without the API/UI:

    python -m deal_review samples/normal_loan.md
    python -m deal_review samples/edge_case_loan.md --rules rules/lending_policy.yaml
"""
import argparse
import json
import sys
from pathlib import Path

import yaml

from .graph import GRAPH
from .ingestion import build_clause_index, load_document
from .report import render_markdown
from .state import Rule, seeded_initial_state

BUNDLED_RULES = Path(__file__).parent.parent / "rules" / "lending_policy.yaml"


def _serialize(state: dict) -> dict:
    out = {}
    for k, v in state.items():
        if isinstance(v, list):
            out[k] = [item.model_dump(mode="json") if hasattr(item, "model_dump") else item for item in v]
        elif hasattr(v, "model_dump"):
            out[k] = v.model_dump(mode="json")
        else:
            out[k] = v
    return out


def main():
    parser = argparse.ArgumentParser(description="Run the deal review pipeline on a local file.")
    parser.add_argument("document", help="Path to the deal document (.pdf, .docx, .md, .txt)")
    parser.add_argument("--rules", default=str(BUNDLED_RULES), help="Path to a rules YAML file")
    parser.add_argument("--out", default=None, help="Output directory (default: outputs/<document stem>)")
    args = parser.parse_args()

    doc_path = Path(args.document)
    out_dir = Path(args.out) if args.out else Path(__file__).parent.parent / "outputs" / doc_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Ingesting {doc_path} ...")
    full_text, line_pages, notes = load_document(doc_path.name, doc_path.read_bytes())
    clause_index, page_map = build_clause_index(full_text, line_pages)
    for n in notes:
        print(f"  note: {n}")
    print(f"  {len(clause_index)} clauses indexed")

    rules = [Rule(**r) for r in yaml.safe_load(Path(args.rules).read_text())]
    print(f"Loaded {len(rules)} policy rules from {args.rules}")

    initial_state = seeded_initial_state(clause_index, page_map, rules, document_text=full_text)

    print("Running pipeline (extraction -> compliance -> risk & summary -> escalation gate)...")
    final_state = GRAPH.invoke(initial_state)

    report_md = render_markdown(final_state)
    (out_dir / "report.md").write_text(report_md, encoding="utf-8")
    (out_dir / "result.json").write_text(json.dumps(_serialize(final_state), indent=2), encoding="utf-8")

    print(f"\nOverall status: {final_state.get('overall_status')}")
    print(f"Terms extracted: {len(final_state.get('terms', []))}")
    print(f"Rules evaluated: {len(final_state.get('rule_results', []))}")
    print(f"Risks identified: {len(final_state.get('risks', []))}")
    print(f"Escalations: {len(final_state.get('escalations', []))}")
    print(f"\nWrote {out_dir / 'report.md'}")
    print(f"Wrote {out_dir / 'result.json'}")


if __name__ == "__main__":
    sys.exit(main())
