import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MOCK_USERS } from "@/lib/mock/users";
import { ROLE_LABELS, ROLE_BADGE_COLORS } from "@/lib/constants/roles";
import type { UserRole } from "@/types/org";

export const metadata = { title: "Users & Roles" };

export default function UsersPage() {
  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Users & Roles"
        subtitle={`${MOCK_USERS.length} members in your organization`}
      />

      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-overlay">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Role</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((user) => {
              const roleKey  = user.role as UserRole;
              const roleLabel = ROLE_LABELS[roleKey] ?? user.role;
              const badgeClass = ROLE_BADGE_COLORS[roleKey] ?? "text-content-muted border-surface-border bg-surface-overlay";
              const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

              return (
                <tr key={user.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
                        <span className="text-gold text-[10px] font-bold">{initials}</span>
                      </div>
                      <span className="font-medium text-content-primary">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-content-secondary hidden md:table-cell">{user.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center border rounded-[var(--radius-badge)] text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 ${badgeClass}`}>
                      {roleLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
