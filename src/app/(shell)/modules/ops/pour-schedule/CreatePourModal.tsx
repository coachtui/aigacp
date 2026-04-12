"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { PourEvent, CreatePourInput } from "@/lib/ops/types";
import type { UserRole } from "@/types/org";
import { POUR_TYPE_OPTIONS, canSubmitForApproval, isAdminRole, POUR_STATUS } from "@/lib/ops/pourRules";

/** How the save action should be interpreted by the caller. */
export type PourSaveAction = "draft" | "submit" | "preserve";

interface Props {
  /** If provided, form is pre-filled for editing. */
  initialData?: PourEvent;
  onClose:      () => void;
  onSubmit:     (input: CreatePourInput, action: PourSaveAction) => void;
  role:         UserRole;
  userId:       string;
}

interface FormState {
  location:          string;
  date:              string;
  time:              string;
  pourType:          string;
  yardage:           string;
  estimatedDuration: string;
  notes:             string;
  pumpRequested:     boolean;
  pumpType:          string;
  pumpNotes:         string;
  masonRequested:    boolean;
  masonCount:        string;
  masonNotes:        string;
}

function toFormState(pour?: PourEvent): FormState {
  if (!pour) {
    return {
      location: "", date: "", time: "07:00", pourType: POUR_TYPE_OPTIONS[0],
      yardage: "", estimatedDuration: "", notes: "",
      pumpRequested: false, pumpType: "", pumpNotes: "",
      masonRequested: false, masonCount: "", masonNotes: "",
    };
  }
  return {
    location:          pour.location,
    date:              pour.date,
    time:              pour.time,
    pourType:          pour.pourType,
    yardage:           String(pour.yardage),
    estimatedDuration: pour.estimatedDuration ?? "",
    notes:             pour.notes ?? "",
    pumpRequested:     pour.pumpRequest.requested,
    pumpType:          pour.pumpRequest.pumpType ?? "",
    pumpNotes:         pour.pumpRequest.notes ?? "",
    masonRequested:    pour.masonRequest.requested,
    masonCount:        pour.masonRequest.masonCount != null ? String(pour.masonRequest.masonCount) : "",
    masonNotes:        pour.masonRequest.notes ?? "",
  };
}

export function CreatePourModal({ initialData, onClose, onSubmit, role, userId }: Props) {
  const isEdit         = !!initialData;
  const currentStatus  = initialData?.status;
  const isAdmin        = isAdminRole(role);
  const [form, setForm] = useState<FormState>(() => toFormState(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // ── Button visibility rules ──────────────────────────────────────────────
  //
  // Non-admin editing their own Approved pour → editing triggers re-approval.
  // The only option is "Save & Resubmit for Approval".
  const nonAdminEditingApproved =
    isEdit && !isAdmin && currentStatus === POUR_STATUS.APPROVED;

  // Admin editing a non-Draft, non-Rejected pour → "Save Changes" (keeps status).
  const adminEditingStable =
    isEdit &&
    isAdmin &&
    currentStatus !== POUR_STATUS.DRAFT &&
    currentStatus !== POUR_STATUS.REJECTED;

  // Show "Submit for Approval" when creating or editing a Draft/Rejected pour.
  const showSubmitForApproval =
    !nonAdminEditingApproved &&
    !adminEditingStable &&
    (!isEdit || canSubmitForApproval(role, { status: currentStatus!, createdBy: initialData!.createdBy }, userId));

  // Show "Save as Draft" for create and edit-of-Draft/Rejected (not for non-admin Approved).
  const showSaveDraft = !nonAdminEditingApproved && !adminEditingStable;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.location.trim())      next.location  = "Required";
    if (!form.date)                 next.date      = "Required";
    if (!form.time)                 next.time      = "Required";
    if (!form.pourType)             next.pourType  = "Required";
    const yardNum = Number(form.yardage);
    if (!form.yardage || isNaN(yardNum) || yardNum <= 0) next.yardage = "Enter a positive number";
    if (form.masonRequested) {
      const count = Number(form.masonCount);
      if (!form.masonCount || isNaN(count) || count < 1) next.masonCount = "Enter a count ≥ 1";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildInput(): CreatePourInput {
    return {
      location:          form.location.trim(),
      date:              form.date,
      time:              form.time,
      pourType:          form.pourType as CreatePourInput["pourType"],
      yardage:           Number(form.yardage),
      estimatedDuration: form.estimatedDuration.trim() || undefined,
      notes:             form.notes.trim() || undefined,
      pumpRequest: {
        requested: form.pumpRequested,
        pumpType:  form.pumpRequested ? form.pumpType.trim() || undefined : undefined,
        notes:     form.pumpRequested ? form.pumpNotes.trim() || undefined : undefined,
      },
      masonRequest: {
        requested:   form.masonRequested,
        masonCount:  form.masonRequested ? Number(form.masonCount) : undefined,
        notes:       form.masonRequested ? form.masonNotes.trim() || undefined : undefined,
      },
      // createdBy/createdByName are injected by the page for creates;
      // for edits they stay as the original creator values.
      createdBy:     initialData?.createdBy     ?? "",
      createdByName: initialData?.createdByName ?? "",
    };
  }

  function handleSaveDraft() {
    if (!validate()) return;
    onSubmit(buildInput(), "draft");
  }

  function handleSubmitForApproval() {
    if (!validate()) return;
    onSubmit(buildInput(), "submit");
  }

  function handlePreserve() {
    if (!validate()) return;
    onSubmit(buildInput(), "preserve");
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-base border border-surface-border rounded-[var(--radius-card)] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-base font-bold text-content-primary">
              {isEdit ? "Edit Pour" : "Create Pour"}
            </h2>
            <p className="text-xs text-content-muted mt-0.5">
              {isEdit
                ? `Editing ${initialData!.status} pour — ${initialData!.location}`
                : "Add a new pour to the schedule"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-content-muted hover:text-content-primary transition-colors p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Re-approval notice for non-admin editing an Approved pour */}
        {nonAdminEditingApproved && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-status-warning mt-0.5 shrink-0" />
            <p className="text-xs text-status-warning leading-snug">
              This pour is <strong>Approved</strong>. Saving changes will move it back to{" "}
              <strong>Pending Approval</strong> so it can be re-reviewed.
            </p>
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-5">

          {/* Core details */}
          <Section title="Pour Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Location *" error={errors.location} className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="e.g. Highland Tower — Level 5"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={inputCls(!!errors.location)}
                />
              </Field>

              <Field label="Date *" error={errors.date}>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={inputCls(!!errors.date)}
                />
              </Field>

              <Field label="Start Time *" error={errors.time}>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => set("time", e.target.value)}
                  className={inputCls(!!errors.time)}
                />
              </Field>

              <Field label="Pour Type *" error={errors.pourType}>
                <select
                  value={form.pourType}
                  onChange={(e) => set("pourType", e.target.value)}
                  className={inputCls(!!errors.pourType)}
                >
                  {POUR_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <Field label="Yardage (yd³) *" error={errors.yardage}>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 220"
                  value={form.yardage}
                  onChange={(e) => set("yardage", e.target.value)}
                  className={inputCls(!!errors.yardage)}
                />
              </Field>

              <Field label="Est. Duration" className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="e.g. 4 hours"
                  value={form.estimatedDuration}
                  onChange={(e) => set("estimatedDuration", e.target.value)}
                  className={inputCls(false)}
                />
              </Field>

              <Field label="Notes" className="sm:col-span-2">
                <textarea
                  rows={2}
                  placeholder="Any additional details…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className={`${inputCls(false)} resize-none`}
                />
              </Field>
            </div>
          </Section>

          {/* Pump request */}
          <Section title="Pump Truck">
            <Toggle
              label="Request a pump truck for this pour"
              checked={form.pumpRequested}
              onChange={(v) => set("pumpRequested", v)}
            />
            {form.pumpRequested && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Field label="Pump Type">
                  <input
                    type="text"
                    placeholder="e.g. 60m Boom"
                    value={form.pumpType}
                    onChange={(e) => set("pumpType", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Any specifics for the pump operator"
                    value={form.pumpNotes}
                    onChange={(e) => set("pumpNotes", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* Mason request */}
          <Section title="Mason Crew">
            <Toggle
              label="Request masons for this pour"
              checked={form.masonRequested}
              onChange={(v) => set("masonRequested", v)}
            />
            {form.masonRequested && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Field label="Mason Count *" error={errors.masonCount}>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="e.g. 4"
                    value={form.masonCount}
                    onChange={(e) => set("masonCount", e.target.value)}
                    className={inputCls(!!errors.masonCount)}
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Skill level, area, etc."
                    value={form.masonNotes}
                    onChange={(e) => set("masonNotes", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-sm text-content-muted hover:text-content-primary transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">

            {/* Save as Draft — create mode and editing Draft/Rejected */}
            {showSaveDraft && (
              <button
                onClick={handleSaveDraft}
                className="text-sm font-semibold px-4 py-2 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors"
              >
                Save as Draft
              </button>
            )}

            {/* Submit for Approval — create mode and editing Draft/Rejected */}
            {showSubmitForApproval && (
              <button
                onClick={handleSubmitForApproval}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
              >
                {isEdit ? "Save & Submit for Approval" : "Submit for Approval"}
              </button>
            )}

            {/* Save & Resubmit — non-admin editing their own Approved pour */}
            {nonAdminEditingApproved && (
              <button
                onClick={handleSubmitForApproval}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-status-warning hover:bg-status-warning/90 text-white transition-colors"
              >
                Save & Resubmit for Approval
              </button>
            )}

            {/* Save Changes — admin editing a stable (non-Draft/Rejected) pour */}
            {adminEditingStable && (
              <button
                onClick={handlePreserve}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
              >
                Save Changes
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small form helpers ────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return `w-full text-sm bg-surface-overlay border rounded-lg px-3 py-2 text-content-primary focus:outline-none transition-colors ${
    hasError
      ? "border-status-error focus:border-status-error"
      : "border-surface-border focus:border-gold"
  }`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3 border-b border-surface-border pb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label, error, className, children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-content-secondary mb-1">{label}</label>
      {children}
      {error && <p className="text-[10px] text-status-error mt-1">{error}</p>}
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          checked ? "bg-gold" : "bg-surface-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-sm text-content-secondary">{label}</span>
    </label>
  );
}
