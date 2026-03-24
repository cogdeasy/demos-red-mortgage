'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api, Application, DashboardStats } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'conditionally_approved', label: 'Conditionally Approved' },
  { value: 'declined', label: 'Declined' },
];

type SortColumn = 'created_at' | 'loan_amount' | 'ltv_ratio' | 'applicant_last_name';
type SortOrder = 'asc' | 'desc';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchApplications = useCallback(async (searchTerm: string, status: string, sort: SortColumn, order: SortOrder, pageNum: number = 1) => {
    setListLoading(true);
    try {
      const appsData = await api.applications.list({
        search: searchTerm || undefined,
        status: status || undefined,
        sort_by: sort,
        sort_order: order,
        page: pageNum,
      });
      setApplications(appsData.data);
      setTotalCount(appsData.total);
      setTotalPages(Math.max(1, Math.ceil(appsData.total / appsData.limit)));
      setPage(appsData.page);
    } catch (e) {
      console.error('Error fetching applications:', e);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [statsData, appsData] = await Promise.all([
          api.applications.stats(),
          api.applications.list({ sort_by: 'created_at', sort_order: 'desc', page: 1 }),
        ]);
        setStats(statsData);
        setApplications(appsData.data);
        setTotalCount(appsData.total);
        setTotalPages(Math.max(1, Math.ceil(appsData.total / appsData.limit)));
        setPage(appsData.page);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchApplications(value, statusFilter, sortBy, sortOrder, 1);
    }, 300);
  };

  const handleStatusChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatusFilter(value);
    fetchApplications(search, value, sortBy, sortOrder, 1);
  };

  const handleSort = (column: SortColumn) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const newOrder: SortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newOrder);
    fetchApplications(search, statusFilter, column, newOrder, 1);
  };

  const sortIndicator = (column: SortColumn) => {
    if (sortBy !== column) return ' \u2195';
    return sortOrder === 'asc' ? ' \u2191' : ' \u2193';
  };

  if (loading) return <div className="container dashboard"><p>Loading...</p></div>;
  if (error) return <div className="container dashboard"><p style={{ color: 'var(--danger)' }}>Error: {error}</p></div>;

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <Link href="/" className="header-logo">
            <Image src="/hsbc-logo.svg" alt="HSBC" width={120} height={32} priority />
          </Link>
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
            <div className="value">{stats?.avg_loan_amount ? formatCurrency(stats.avg_loan_amount) : '\u2014'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent Applications</h2>
            <Link href="/applications/new" className="btn btn-primary">+ New Application</Link>
          </div>
          <div className="search-filters">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email, or postcode..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search applications"
            />
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="card-body" style={{ padding: 0, position: 'relative' }}>
            {listLoading && (
              <div className="list-loading-overlay">
                <p>Loading...</p>
              </div>
            )}
            {applications.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {search || statusFilter ? 'No applications match your filters.' : (
                  <>No applications yet.{' '}<Link href="/applications/new" style={{ color: 'var(--accent)' }}>Create your first application</Link></>
                )}
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('applicant_last_name')}>
                      Applicant{sortIndicator('applicant_last_name')}
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('loan_amount')}>
                      Loan Amount{sortIndicator('loan_amount')}
                    </th>
                    <th>Property</th>
                    <th className="sortable-header" onClick={() => handleSort('ltv_ratio')}>
                      LTV{sortIndicator('ltv_ratio')}
                    </th>
                    <th>Status</th>
                    <th className="sortable-header" onClick={() => handleSort('created_at')}>
                      Created{sortIndicator('created_at')}
                    </th>
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
                      <td>{app.property_city || '\u2014'}{app.property_postcode ? `, ${app.property_postcode}` : ''}</td>
                      <td>{app.ltv_ratio ? `${(app.ltv_ratio * 100).toFixed(1)}%` : '\u2014'}</td>
                      <td><span className={`badge badge-${app.status}`}>{app.status.replace(/_/g, ' ')}</span></td>
                      <td>{formatDate(app.created_at)}</td>
                      <td><Link href={`/applications/${app.id}`} className="btn btn-outline btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing page {page} of {totalPages} ({totalCount} total)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => fetchApplications(search, statusFilter, sortBy, sortOrder, page - 1)}
                    disabled={page <= 1 || listLoading}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => fetchApplications(search, statusFilter, sortBy, sortOrder, page + 1)}
                    disabled={page >= totalPages || listLoading}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
