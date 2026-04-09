import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { Users, Calendar, Clock, ArrowUpRight } from "lucide-react";

export const metadata = { title: "CRU" };

const FEATURES = [
  { icon: <Users    size={16} className="text-gold" />, title: "Crew Scheduling",    desc: "Build and manage crew schedules with conflict detection and real-time updates." },
  { icon: <Clock    size={16} className="text-gold" />, title: "Mobile Clock-In",    desc: "Geo-verified clock-in for field crews — no hardware required." },
  { icon: <Calendar size={16} className="text-gold" />, title: "Utilization Reports", desc: "Weekly and monthly utilization summaries across projects and trade types." },
];

export default function CruPage() {
  return (
    <PageContainer>
      {/* Module hero */}
      <div className="rounded-[var(--radius-card)] border border-gold/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6" style={{ boxShadow: "var(--shadow-card-gold)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-gold" />
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Module</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">CRU</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Crew resource and utilization management. Schedule, track, and optimize your workforce from pre-con through project closeout.
        </p>
        <Link
          href="#"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse text-sm font-semibold transition-colors"
        >
          Launch CRU <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} variant="default">
            <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
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
