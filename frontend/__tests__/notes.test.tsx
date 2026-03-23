import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-app-id' }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { priority, ...rest } = props;
    return React.createElement('img', rest);
  },
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

const mockApplication = {
  id: 'test-app-id',
  status: 'submitted',
  applicant_first_name: 'Sarah',
  applicant_last_name: 'Thompson',
  applicant_email: 'sarah@test.com',
  applicant_phone: '07700100201',
  applicant_annual_income: 95000,
  applicant_employment_status: 'employed',
  applicant_employer_name: 'Barclays',
  property_address_line1: '42 Victoria Embankment',
  property_city: 'London',
  property_postcode: 'EC4Y 0DZ',
  property_country: 'United Kingdom',
  property_type: 'flat',
  property_value: 550000,
  loan_amount: 385000,
  loan_term_months: 300,
  loan_type: 'fixed',
  interest_rate: 0.0425,
  ltv_ratio: 0.7,
  monthly_payment: 2100,
  decision: null,
  decision_reason: null,
  assigned_underwriter: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockNotes = [
  {
    id: 'note-1',
    application_id: 'test-app-id',
    author: 'j.williams@hsbc.co.uk',
    content: 'Income documentation verified.',
    note_type: 'general',
    created_at: '2024-01-02T10:00:00Z',
  },
  {
    id: 'note-2',
    application_id: 'test-app-id',
    author: 'm.chen@hsbc.co.uk',
    content: 'LTV ratio is borderline.',
    note_type: 'condition',
    created_at: '2024-01-01T10:00:00Z',
  },
];

const mockAuditEvents = [
  {
    id: 'audit-1',
    application_id: 'test-app-id',
    entity_type: 'application',
    entity_id: 'test-app-id',
    action: 'application.created',
    actor: 'system',
    changes: { status: { from: null, to: 'draft' } },
    metadata: { source: 'api' },
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Setup fetch mock
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;

  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/notes')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockNotes }),
      });
    }
    if (url.includes('/audit')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockAuditEvents }),
      });
    }
    if (url.includes('/applications/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApplication),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Use direct import - jest config handles JSX transformation
import ApplicationDetail from '../src/app/applications/[id]/page';

describe('Notes Section', () => {
  it('should render the notes section with count', async () => {
    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Notes \(2\)/)).toBeInTheDocument();
    });
  });

  it('should display notes with correct author, content, and type', async () => {
    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('j.williams@hsbc.co.uk')).toBeInTheDocument();
      expect(screen.getByText('Income documentation verified.')).toBeInTheDocument();
      expect(screen.getByText('general')).toBeInTheDocument();
      expect(screen.getByText('m.chen@hsbc.co.uk')).toBeInTheDocument();
      expect(screen.getByText('LTV ratio is borderline.')).toBeInTheDocument();
      expect(screen.getByText('condition')).toBeInTheDocument();
    });
  });

  it('should show "No notes yet" when no notes exist', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/notes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      if (url.includes('/audit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApplication),
      });
    });

    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });
  });

  it('should render the Add Note form with required fields', async () => {
    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      const addNoteElements = screen.getAllByText('Add Note');
      expect(addNoteElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByPlaceholderText('e.g. j.williams@hsbc.co.uk')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter note content...')).toBeInTheDocument();
    });
  });

  it('should have Add Note button disabled when content or author is empty', async () => {
    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const addNoteBtn = buttons.find(b => b.textContent === 'Add Note');
      expect(addNoteBtn).toBeDisabled();
    });
  });

  it('should render delete buttons on each note', async () => {
    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBe(2);
    });
  });

  it('should render the note type filter dropdown', async () => {
    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      expect(screen.getByText('All Types')).toBeInTheDocument();
    });
  });

  it('should submit new note via API when form is filled and button clicked', async () => {
    const createdNote = {
      id: 'note-3',
      application_id: 'test-app-id',
      author: 'test@test.com',
      content: 'New test note',
      note_type: 'general',
      created_at: '2024-01-03T10:00:00Z',
    };

    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'POST' && url.includes('/notes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createdNote),
        });
      }
      if (url.includes('/notes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [...mockNotes, createdNote] }),
        });
      }
      if (url.includes('/audit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAuditEvents }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApplication),
      });
    });

    await act(async () => {
      render(<ApplicationDetail />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. j.williams@hsbc.co.uk')).toBeInTheDocument();
    });

    const authorInput = screen.getByPlaceholderText('e.g. j.williams@hsbc.co.uk');
    const contentInput = screen.getByPlaceholderText('Enter note content...');

    await act(async () => {
      fireEvent.change(authorInput, { target: { value: 'test@test.com' } });
      fireEvent.change(contentInput, { target: { value: 'New test note' } });
    });

    const addNoteBtn = screen.getAllByRole('button').find(b => b.textContent === 'Add Note');
    expect(addNoteBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(addNoteBtn!);
    });

    // Verify POST was called
    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        (call: [string, RequestInit?]) => call[1]?.method === 'POST' && call[0].includes('/notes')
      );
      expect(postCalls.length).toBeGreaterThan(0);
    });
  });
});
