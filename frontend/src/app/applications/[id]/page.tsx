'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Application, AuditEvent, Note } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default function ApplicationDetail() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<Application | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteFilter, setNoteFilter] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  async function load() {
    try {
      const [appData, auditData, notesData] = await Promise.all([
        api.applications.get(id),
        api.applications.audit(id),
        api.notes.list(id, noteFilter || undefined),
      ]);
      setApp(appData);
      setAudit(auditData.data);
      setNotes(notesData.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSubmit() {
    setActionLoading(true);
    try {
      await api.applications.submit(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecision(decision: string) {
    const reason = prompt(`Enter reason for ${decision}:`);
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.applications.decide(id, decision, reason, 'underwriter@demo.com');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="container dashboard"><p>Loading...</p></div>;
  if (error || !app) return <div className="container dashboard"><p style={{ color: 'var(--danger)' }}>Error: {error}</p></div>;

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <Link href="/" className="header-logo">
            <Image src="/hsbc-logo.svg" alt="HSBC" width={120} height={32} priority />
          </Link>
          <nav className="header-nav">
            <Link href="/">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="container dashboard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>
              {app.applicant_first_name} {app.applicant_last_name}
            </h2>
            <span className={`badge badge-${app.status}`}>{app.status.replace(/_/g, ' ')}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {app.status === 'draft' && (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={actionLoading}>
                Submit for Review
              </button>
            )}
            {(app.status === 'submitted' || app.status === 'under_review') && (
              <>
                <button className="btn btn-secondary" onClick={() => handleDecision('approved')} disabled={actionLoading}>
                  Approve
                </button>
                <button className="btn btn-outline" onClick={() => handleDecision('conditionally_approved')} disabled={actionLoading}>
                  Conditional
                </button>
                <button className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => handleDecision('declined')} disabled={actionLoading}>
                  Decline
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div>
            <div className="card">
              <div className="card-header"><h2>Applicant Details</h2></div>
              <div className="card-body">
                <div className="form-grid">
                  <div><strong>Email:</strong> {app.applicant_email}</div>
                  <div><strong>Phone:</strong> {app.applicant_phone || '—'}</div>
                  <div><strong>Annual Income:</strong> {app.applicant_annual_income ? formatCurrency(app.applicant_annual_income) : '—'}</div>
                  <div><strong>Employment:</strong> {app.applicant_employment_status || '—'}</div>
                  <div><strong>Employer:</strong> {app.applicant_employer_name || '—'}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Property Details</h2></div>
              <div className="card-body">
                <div className="form-grid">
                  <div><strong>Address:</strong> {[app.property_address_line1, app.property_address_line2, app.property_city, app.property_postcode].filter(Boolean).join(', ') || '—'}</div>
                  <div><strong>Type:</strong> {app.property_type || '—'}</div>
                  <div><strong>Value:</strong> {app.property_value ? formatCurrency(app.property_value) : '—'}</div>
                  <div><strong>Country:</strong> {app.property_country || '—'}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Audit Trail</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                {audit.length === 0 ? (
                  <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No audit events</p>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Time</th><th>Action</th><th>Actor</th><th>Changes</th></tr>
                    </thead>
                    <tbody>
                      {audit.map((event) => (
                        <tr key={event.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(event.created_at)}</td>
                          <td><code style={{ fontSize: '0.8rem' }}>{event.action}</code></td>
                          <td>{event.actor || '—'}</td>
                          <td style={{ fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.changes ? JSON.stringify(event.changes) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header"><h2>Loan Summary</h2></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loan Amount</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(app.loan_amount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Term</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{app.loan_term_months / 12} years</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, textTransform: 'capitalize' }}>{app.loan_type}</div>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interest Rate</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{app.interest_rate ? formatPercent(app.interest_rate) : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LTV Ratio</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: app.ltv_ratio && app.ltv_ratio > 0.9 ? 'var(--danger)' : 'inherit' }}>
                      {app.ltv_ratio ? formatPercent(app.ltv_ratio) : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monthly Payment</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {app.monthly_payment ? formatCurrency(app.monthly_payment) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {app.decision && (
              <div className="card">
                <div className="card-header"><h2>Decision</h2></div>
                <div className="card-body">
                  <div><span className={`badge badge-${app.status}`}>{app.decision?.replace(/_/g, ' ')}</span></div>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>{app.decision_reason}</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    By: {app.assigned_underwriter}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="card">
          <div className="card-header">
            <h2>Notes ({notes.length})</h2>
            <div className="notes-filter">
              <select
                value={noteFilter}
                onChange={(e) => {
                  setNoteFilter(e.target.value);
                  api.notes.list(id, e.target.value || undefined).then((res) => setNotes(res.data));
                }}
              >
                <option value="">All Types</option>
                <option value="general">General</option>
                <option value="internal">Internal</option>
                <option value="condition">Condition</option>
                <option value="follow_up">Follow Up</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fafafa', borderRadius: '4px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Add Note</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Author</label>
                  <input
                    type="text"
                    placeholder="e.g. j.williams@hsbc.co.uk"
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                    <option value="general">General</option>
                    <option value="internal">Internal</option>
                    <option value="condition">Condition</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label>Content</label>
                <textarea
                  rows={3}
                  placeholder="Enter note content..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={noteSubmitting || !noteContent.trim() || !noteAuthor.trim()}
                  onClick={async () => {
                    setNoteSubmitting(true);
                    try {
                      await api.notes.create(id, { author: noteAuthor, content: noteContent, note_type: noteType });
                      setNoteContent('');
                      const res = await api.notes.list(id, noteFilter || undefined);
                      setNotes(res.data);
                      const auditRes = await api.applications.audit(id);
                      setAudit(auditRes.data);
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Failed to add note');
                    } finally {
                      setNoteSubmitting(false);
                    }
                  }}
                >
                  {noteSubmitting ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>

            {notes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No notes yet</p>
            ) : (
              <div>
                {notes.map((note) => (
                  <div key={note.id} className="note-item">
                    <div className="note-meta">
                      <strong>{note.author}</strong>
                      <span className={`badge badge-${note.note_type}`}>{note.note_type.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDateTime(note.created_at)}</span>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={async () => {
                          if (!confirm('Delete this note?')) return;
                          try {
                            await api.notes.delete(note.id);
                            const res = await api.notes.list(id, noteFilter || undefined);
                            setNotes(res.data);
                            const auditRes = await api.applications.audit(id);
                            setAudit(auditRes.data);
                          } catch (e) {
                            alert(e instanceof Error ? e.message : 'Failed to delete note');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="note-content">{note.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
