'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function NewApplication() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      applicant_first_name: formData.get('first_name') as string,
      applicant_last_name: formData.get('last_name') as string,
      applicant_email: formData.get('email') as string,
      applicant_phone: formData.get('phone') as string || undefined,
      applicant_annual_income: formData.get('income') ? Number(formData.get('income')) : undefined,
      applicant_employment_status: formData.get('employment') as string || undefined,
      applicant_employer_name: formData.get('employer') as string || undefined,
      property_address_line1: formData.get('address1') as string || undefined,
      property_address_line2: formData.get('address2') as string || undefined,
      property_city: formData.get('city') as string || undefined,
      property_postcode: formData.get('postcode') as string || undefined,
      property_type: formData.get('property_type') as string || undefined,
      property_value: formData.get('property_value') ? Number(formData.get('property_value')) : undefined,
      loan_amount: Number(formData.get('loan_amount')),
      loan_term_months: Number(formData.get('loan_term')) * 12,
      loan_type: formData.get('loan_type') as string || 'fixed',
    };

    try {
      const app = await api.applications.create(data);
      router.push(`/applications/${app.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create application');
      setSaving(false);
    }
  }

  return (
    <>
      <div className="top-accent" />
      <header className="header">
        <div className="container header-content">
          <div className="header-logo">
            <div className="logo-mark">▲</div>
            <h1>HSBC Mortgage Services</h1>
          </div>
          <nav className="header-nav">
            <Link href="/">Dashboard</Link>
            <a href="/applications/new" className="active">New Application</a>
          </nav>
        </div>
      </header>

      <main className="container dashboard">
        <div className="card">
          <div className="card-header">
            <h2>New Mortgage Application</h2>
          </div>
          <div className="card-body">
            {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Error: {error}</p>}

            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Applicant Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name *</label>
                    <input id="first_name" name="first_name" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name *</label>
                    <input id="last_name" name="last_name" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input id="email" name="email" type="email" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="income">Annual Income (GBP)</label>
                    <input id="income" name="income" type="number" min="0" step="1000" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="employment">Employment Status</label>
                    <select id="employment" name="employment">
                      <option value="">Select...</option>
                      <option value="employed">Employed</option>
                      <option value="self-employed">Self-Employed</option>
                      <option value="contractor">Contractor</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="employer">Employer Name</label>
                    <input id="employer" name="employer" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Property Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="address1">Address Line 1</label>
                    <input id="address1" name="address1" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address2">Address Line 2</label>
                    <input id="address2" name="address2" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input id="city" name="city" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="postcode">Postcode</label>
                    <input id="postcode" name="postcode" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="property_type">Property Type</label>
                    <select id="property_type" name="property_type">
                      <option value="">Select...</option>
                      <option value="detached">Detached</option>
                      <option value="semi-detached">Semi-Detached</option>
                      <option value="terraced">Terraced</option>
                      <option value="flat">Flat</option>
                      <option value="bungalow">Bungalow</option>
                      <option value="new-build">New Build</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="property_value">Property Value (GBP)</label>
                    <input id="property_value" name="property_value" type="number" min="0" step="1000" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Loan Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="loan_amount">Loan Amount (GBP) *</label>
                    <input id="loan_amount" name="loan_amount" type="number" min="10000" step="1000" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="loan_term">Loan Term (years) *</label>
                    <input id="loan_term" name="loan_term" type="number" min="1" max="40" required defaultValue="25" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="loan_type">Loan Type</label>
                    <select id="loan_type" name="loan_type">
                      <option value="fixed">Fixed Rate</option>
                      <option value="variable">Variable Rate</option>
                      <option value="tracker">Tracker</option>
                      <option value="offset">Offset</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <Link href="/" className="btn btn-outline">Cancel</Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
