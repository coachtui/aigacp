import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { ClipboardCheck, Camera, FileCheck, ArrowUpRight } from "lucide-react";

export const metadata = { title: "Inspect" };

const FEATURES = [
  { icon: <ClipboardCheck size={16} className="text-blue-brand" />, title: "Custom Checklists",   desc: "Build inspection templates by project type, trade, or compliance requirement." },
  { icon: <Camera         size={16} className="text-blue-brand" />, title: "Photo Documentation", desc: "Attach geo-tagged photos directly to inspection line items from the field." },
  { icon: <FileCheck      size={16} className="text-blue-brand" />, title: "Sign-Off Workflow",   desc: "Digital sign-off with timestamped records — ready for owner and regulatory review." },
];

export default function InspectPage() {
  return (
    <PageContainer>
      <div className="rounded-[var(--radius-card)] border border-blue-brand/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-blue-brand" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-brand">Module</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Inspect</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Field inspection workflows and reporting. Capture findings, document conditions, and deliver sign-off-ready reports from anywhere on the jobsite.
        </p>
        <Link
          href="#"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-blue-brand hover:opacity-90 text-white text-sm font-semibold transition-opacity"
        >
          Launch Inspect <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} variant="default">
            <div className="w-8 h-8 rounded-lg bg-blue-brand/10 border border-blue-brand/20 flex items-center justify-center mb-3">
              {f.icon}
            </div>
            <p className="font-semibold text-content-primary text-sm">{f.title}</p>
            <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
