import type { PageSummary } from '@/utils/dom-analyzer';
export function SummaryCard({ summary }: { summary: PageSummary | null }) {
  if (!summary) return null;
  return <section className="navi-card" aria-labelledby="summary-title"><h2 id="summary-title">Contenido detectado</h2><p><strong>{summary.title}</strong></p>{summary.headings.length > 0 && <p>{summary.headings.length} secciones y {summary.links.length} enlaces disponibles.</p>}</section>;
}
