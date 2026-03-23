'use client';

import { useEffect, useState } from 'react';
import { api, Application, DashboardStats } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, appsData] = await Promise.all([
          api.applications.stats(),
          api.applications.list(),
        ]);
        setStats(statsData);
        setApplications(appsData.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="container dashboard"><p>Loading...</p></div>;
  if (error) return <div className="container dashboard"><p style={{ color: 'var(--danger)' }}>Error: {error}</p></div>;

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <a href="/" className="header-logo">
            <Image src="/hsbc-logo.svg" alt="HSBC" width={120} height={32} priority />
          </a>
          <nav className="header-nav">
            <a href="/" className="active">Dashboard</a>
            <Link href="/applications/new">New Application</Link>
          </nav>
        </div>
      </header>

      <main className="container dashboard">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Applications</h3>
            <div className="value">{stats?.total || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Pending Review</h3>
            <div className="value">{(stats?.by_status?.submitted || 0) + (stats?.by_status?.under_review || 0)}</div>
          </div>
          <div className="stat-card">
            <h3>Approved</h3>
            <div className="value">{(stats?.by_status?.approved || 0) + (stats?.by_status?.conditionally_approved || 0)}</div>
          </div>
          <div className="stat-card">
            <h3>Avg Loan Amount</h3>
            <div className="value">{stats?.avg_loan_amount ? formatCurrency(stats.avg_loan_amount) : '—'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent Applications</h2>
            <Link href="/applications/new" className="btn btn-primary">+ New Application</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {applications.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No applications yet.{' '}
                <Link href="/applications/new" style={{ color: 'var(--accent)' }}>Create your first application</Link>
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Loan Amount</th>
                    <th>Property</th>
                    <th>LTV</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.applicant_first_name} {app.applicant_last_name}</strong>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>{app.applicant_email}</small>
                      </td>
                      <td>{formatCurrency(app.loan_amount)}</td>
                      <td>{app.property_city || '—'}{app.property_postcode ? `, ${app.property_postcode}` : ''}</td>
                      <td>{app.ltv_ratio ? `${(app.ltv_ratio * 100).toFixed(1)}%` : '—'}</td>
                      <td><span className={`badge badge-${app.status}`}>{app.status.replace(/_/g, ' ')}</span></td>
                      <td>{formatDate(app.created_at)}</td>
                      <td><Link href={`/applications/${app.id}`} className="btn btn-outline btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
