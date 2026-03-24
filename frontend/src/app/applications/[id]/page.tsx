'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api, Application, AuditEvent, Note, CreditCheck, DocumentRecord } from '@/lib/api';
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [creditCheck, setCreditCheck] = useState<CreditCheck | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [appData, auditData, notesData, docsData] = await Promise.all([
        api.applications.get(id),
        api.applications.audit(id),
        api.notes.list(id),
        api.documents.list(id),
      ]);
      setApp(appData);
      setAudit(auditData.data);
      setNotes(notesData.data);
      setDocuments(docsData.data);

      try {
        const cc = await api.creditCheck.get(id);
        setCreditCheck(cc);
      } catch {
        setCreditCheck(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

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

  async function handleWithdraw() {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    setActionLoading(true);
    try {
      await api.applications.withdraw(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to withdraw');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStartReview() {
    const underwriter = prompt('Enter underwriter email:');
    if (!underwriter) return;
    setActionLoading(true);
    try {
      await api.applications.startReview(id, underwriter);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start review');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecision(decision: string) {
    const reason = prompt(`Enter reason for ${decision}:`);
    if (!reason) return;
    const underwriter = prompt('Enter underwriter email:');
    if (!underwriter) return;
    setActionLoading(true);
    try {
      await api.applications.decide(id, decision, reason, underwriter);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTriggerCreditCheck() {
    setActionLoading(true);
    try {
      const cc = await api.creditCheck.trigger(id);
      setCreditCheck(cc);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to run credit check');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim() || !noteAuthor.trim()) return;
    setNoteSaving(true);
    try {
      await api.notes.create(id, { author: noteAuthor, content: noteContent });
      setNoteContent('');
      const notesData = await api.notes.list(id);
      setNotes(notesData.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setNoteSaving(false);
    }
  }

  if (loading) return <div className="container dashboard"><p>Loading...</p></div>;
  if (error || !app) return <div className="container dashboard"><p style={{ color: 'var(--danger)' }}>Error: {error}</p></div>;

  const riskBandColor: Record<string, string> = {
    low: 'var(--success)',
    medium: 'var(--warning)',
    high: 'var(--danger)',
    very_high: 'var(--danger)',
  };

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
              <>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={actionLoading}>
                  Submit for Review
                </button>
                <button className="btn btn-outline" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                  onClick={handleWithdraw} disabled={actionLoading}>
                  Withdraw
                </button>
              </>
            )}
            {app.status === 'submitted' && (
              <>
                <button className="btn btn-secondary" onClick={handleStartReview} disabled={actionLoading}>
                  Start Review
                </button>
                <button className="btn btn-outline" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                  onClick={handleWithdraw} disabled={actionLoading}>
                  Withdraw
                </button>
              </>
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
                  <div><strong>Phone:</strong> {app.applicant_phone || '\u2014'}</div>
                  <div><strong>Annual Income:</strong> {app.applicant_annual_income ? formatCurrency(app.applicant_annual_income) : '\u2014'}</div>
                  <div><strong>Employment:</strong> {app.applicant_employment_status || '\u2014'}</div>
                  <div><strong>Employer:</strong> {app.applicant_employer_name || '\u2014'}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Property Details</h2></div>
              <div className="card-body">
                <div className="form-grid">
                  <div><strong>Address:</strong> {[app.property_address_line1, app.property_address_line2, app.property_city, app.property_postcode].filter(Boolean).join(', ') || '\u2014'}</div>
                  <div><strong>Type:</strong> {app.property_type || '\u2014'}</div>
                  <div><strong>Value:</strong> {app.property_value ? formatCurrency(app.property_value) : '\u2014'}</div>
                  <div><strong>Country:</strong> {app.property_country || '\u2014'}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Documents</h2></div>
              <div className="card-body" style={{ padding: 0 }}>
                {documents.length === 0 ? (
                  <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No documents uploaded</p>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Type</th><th>File Name</th><th>Size</th><th>Uploaded By</th><th>Verified</th></tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td style={{ textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</td>
                          <td>{doc.file_name}</td>
                          <td>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '\u2014'}</td>
                          <td>{doc.uploaded_by || '\u2014'}</td>
                          <td>
                            {doc.verified ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Verified</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Notes</h2></div>
              <div className="card-body">
                <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem' }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="note_author">Your Name</label>
                      <input
                        id="note_author"
                        value={noteAuthor}
                        onChange={(e) => setNoteAuthor(e.target.value)}
                        placeholder="e.g. j.williams@hsbc.co.uk"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="note_content">Note</label>
                    <textarea
                      id="note_content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add a note about this application..."
                      rows={3}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.9rem', resize: 'vertical' }}
                      required
                    />
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={noteSaving}>
                      {noteSaving ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </form>
                {notes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No notes yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notes.map((note) => (
                      <div key={note.id} style={{ padding: '0.75rem', background: '#fafafa', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>{note.author}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(note.created_at)}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{note.note_type}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                          <td>{event.actor || '\u2014'}</td>
                          <td style={{ fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.changes ? JSON.stringify(event.changes) : '\u2014'}
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
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{app.interest_rate ? formatPercent(app.interest_rate) : '\u2014'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LTV Ratio</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: app.ltv_ratio && app.ltv_ratio > 0.9 ? 'var(--danger)' : 'inherit' }}>
                      {app.ltv_ratio ? formatPercent(app.ltv_ratio) : '\u2014'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monthly Payment</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {app.monthly_payment ? formatCurrency(app.monthly_payment) : '\u2014'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Credit Check</h2>
                {!creditCheck && (
                  <button className="btn btn-outline btn-sm" onClick={handleTriggerCreditCheck} disabled={actionLoading}>
                    Run Check
                  </button>
                )}
              </div>
              <div className="card-body">
                {creditCheck ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Credit Score</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700 }}>{creditCheck.credit_score}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Risk Band</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: riskBandColor[creditCheck.risk_band] || 'inherit', textTransform: 'capitalize' }}>
                        {creditCheck.risk_band.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Provider</div>
                      <div style={{ fontSize: '0.85rem' }}>{creditCheck.provider}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Checked At</div>
                      <div style={{ fontSize: '0.85rem' }}>{formatDateTime(creditCheck.checked_at)}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No credit check performed yet</p>
                )}
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
      </main>
    </>
  );
}
