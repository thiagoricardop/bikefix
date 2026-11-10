"use client";

import Link from "next/link";

import { useId, useRef, useState, type FormEvent } from "react";

type ComponentOption = { id: string; name: string };
type RequestFormProps = {
  enabled: boolean;
  disabledMessage?: string | null;
  components: ComponentOption[];
};

type SubmissionResult = {
  ok?: boolean;
  code?: string;
  message?: string;
  requestId?: string;
  notificationStatus?: "pending" | "accepted" | "failed" | "delivered" | "not_requested";
  fields?: Record<string, string[]>;
};

const bikeTypes = [
  { value: "road", label: "Road bike" },
  { value: "mountain", label: "Mountain bike" },
  { value: "hybrid", label: "Hybrid / commuter" },
  { value: "gravel", label: "Gravel bike" },
  { value: "ebike", label: "E-bike" },
  { value: "unsure", label: "I'm not sure" },
];

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function RepairGuideRequestForm({ enabled, disabledMessage, components }: RequestFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wantsReply, setWantsReply] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || submitting || !formRef.current) return;
    setSubmitting(true);
    setNetworkError(null);
    setResult(null);
    const values = new FormData(formRef.current);
    const payload = {
      summary: String(values.get("summary") ?? ""),
      description: String(values.get("description") ?? ""),
      bicycleType: String(values.get("bicycleType") ?? "unsure"),
      componentId: String(values.get("componentId") ?? "") || undefined,
      triedAlready: String(values.get("triedAlready") ?? "") || undefined,
      email: String(values.get("email") ?? ""),
      wantsReply,
      website: String(values.get("website") ?? ""),
      idempotencyKey,
    };
    try {
      const response = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as SubmissionResult;
      if (!response.ok || !data.ok) {
        setResult(data);
        setNetworkError(data.message || "We couldn't save the request. No recorded-success confirmation was issued.");
        return;
      }
      setResult(data);
    } catch {
      setNetworkError("We couldn't confirm the submission status because the connection was interrupted. Please retry with this form; BikeFix uses the same request token to avoid creating a duplicate.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    formRef.current?.reset();
    setWantsReply(false);
    setResult(null);
    setNetworkError(null);
    setIdempotencyKey(newIdempotencyKey());
  }

  if (result?.ok && result.requestId) {
    return (
      <section className="request-confirmation" aria-labelledby={`${formId}-success`}>
        <div className="request-confirmation-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">REQUEST RECORDED</p>
        <h2 id={`${formId}-success`}>Thanks for helping shape BikeFix.</h2>
        <p>{result.message}</p>
        <div className="request-reference"><span>Private reference</span><code>{result.requestId}</code></div>
        <p className="request-confirmation-note">Keep this reference for your own records. Requests are not publicly listed, and submitting one does not guarantee a guide or a personalized diagnosis.</p>
        <button className="button button--quiet" type="button" onClick={resetForm}>Submit another request</button>
      </section>
    );
  }

  return (
    <form className="repair-request-form" ref={formRef} onSubmit={onSubmit} noValidate={false}>
      {!enabled && <div className="request-disabled-notice" role="status"><strong>Submissions are not enabled here.</strong><p>{disabledMessage || "This deployment has not completed the private-storage, retention, and notification setup. No request will be saved."}</p></div>}
      <div className="request-form-grid">
        <div className="request-field request-field--wide">
          <label htmlFor={`${formId}-summary`}>What guide would help? <span>Required</span></label>
          <input id={`${formId}-summary`} name="summary" required minLength={5} maxLength={120} placeholder="e.g. How to identify a worn chain" disabled={!enabled || submitting} autoComplete="off" />
          <small>5–120 characters. Keep it focused on one problem or repair topic.</small>
        </div>
        <div className="request-field">
          <label htmlFor={`${formId}-bicycle`}>Bicycle type <span>Required</span></label>
          <select id={`${formId}-bicycle`} name="bicycleType" required defaultValue="unsure" disabled={!enabled || submitting}>
            {bikeTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div className="request-field">
          <label htmlFor={`${formId}-component`}>Affected component <span>Optional</span></label>
          <select id={`${formId}-component`} name="componentId" defaultValue="" disabled={!enabled || submitting}>
            <option value="">Not sure / not listed</option>
            {components.map((component) => <option value={component.id} key={component.id}>{component.name}</option>)}
          </select>
        </div>
        <div className="request-field request-field--wide">
          <label htmlFor={`${formId}-description`}>Describe the problem <span>Required</span></label>
          <textarea id={`${formId}-description`} name="description" required minLength={20} maxLength={3000} rows={5} placeholder="What are you trying to understand or do? Include what you can observe, but don't guess at the cause." disabled={!enabled || submitting} />
          <small>20–3,000 characters. Do not include passwords, payment details, or other sensitive information.</small>
        </div>
        <div className="request-field request-field--wide">
          <label htmlFor={`${formId}-tried`}>What have you tried? <span>Optional</span></label>
          <textarea id={`${formId}-tried`} name="triedAlready" rows={3} maxLength={1500} placeholder="Optional context, observations, or guides you've already checked." disabled={!enabled || submitting} />
          <small>Up to 1,500 characters.</small>
        </div>
        <div className="request-field request-field--wide">
          <label className="request-checkbox-label" htmlFor={`${formId}-reply`}>
            <input id={`${formId}-reply`} type="checkbox" checked={wantsReply} onChange={(event) => setWantsReply(event.target.checked)} disabled={!enabled || submitting} />
            <span><strong>I&apos;d like a reply about this request.</strong><small>A reply isn&apos;t guaranteed. If you select this, an email address is required.</small></span>
          </label>
        </div>
        {wantsReply && <div className="request-field request-field--wide">
          <label htmlFor={`${formId}-email`}>Email address <span>Required for a reply</span></label>
          <input id={`${formId}-email`} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" disabled={!enabled || submitting} />
          <small>Used only so the developer can follow up on this request. Leave reply unchecked if you don&apos;t want to provide an email.</small>
        </div>}
      </div>
      {/* Honeypot: hidden from assistive technology and keyboard users; ordinary riders should leave it empty. */}
      <div className="request-honeypot" aria-hidden="true">
        <label htmlFor={`${formId}-website`}>Leave this field empty</label>
        <input id={`${formId}-website`} name="website" tabIndex={-1} autoComplete="off" disabled={!enabled || submitting} />
      </div>
      <div className="request-privacy-copy">
        <strong>Privacy and expectations</strong>
        <p>Your request is stored privately for the BikeFix developer to consider future guide topics. Requests are not published publicly. Contact information is optional unless you ask for a reply, and a reply or new guide is not guaranteed. Read the <Link href="/privacy">privacy notice</Link>.</p>
      </div>
      {networkError && <div className="request-form-error" role="alert">{networkError}{result?.fields && <ul>{Object.entries(result.fields).map(([field, messages]) => <li key={field}><strong>{field}:</strong> {messages.join(" ")}</li>)}</ul>}</div>}
      <div className="request-form-actions">
        <button className="button button--primary" type="submit" disabled={!enabled || submitting}>{submitting ? "Submitting…" : "Send guide request"}<span aria-hidden="true">→</span></button>
        <span>{submitting ? "Saving privately before attempting a notification…" : "No account or file upload required."}</span>
      </div>
    </form>
  );
}
