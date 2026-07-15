import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDepartment } from '../context/DepartmentContext';
import { useRecruitment } from '../context/RecruitmentContext';

// True when a lead's Requirement routes to HR Management instead of Relocation Business.
export const isHrRecruitmentLead = (entry) =>
  (entry?.requirement || '').trim().toLowerCase() === 'hr & recruitment';

/**
 * The "₹ Business Action" behaviour, shared by the salesperson (My Entries) and
 * admin (All Sales) tables:
 *
 *  - HR & Recruitment lead  -> create the HR requirement in the background
 *    (owned by the originating salesperson). Salespeople land on their read-only
 *    progress view; admins are taken into HR Management to assign/manage it.
 *  - Any other requirement  -> open the relevant Business "Add Entry" form with
 *    only the Client Name pre-filled (Remarks stays empty for manual entry).
 *
 * Returns an async `run(entry)` that resolves to a small result object the page
 * can turn into a toast: { ok, kind: 'hr' | 'business', duplicate?, message? }.
 */
export default function useBusinessAction() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { setActiveDepartment } = useDepartment();
  const { createFromSales } = useRecruitment();

  const run = async (entry) => {
    if (!entry?._id) return { ok: false, message: 'Invalid entry' };

    // Condition 2 — HR & Recruitment
    if (isHrRecruitmentLead(entry)) {
      if (isAdmin()) {
        // Admin: create straight away, then switch into HR Management to
        // view/edit/assign/manage (they have the full form there too).
        const res = await createFromSales(entry._id);
        if (!res.success) return { ok: false, kind: 'hr', message: res.message };
        setActiveDepartment('hr');
        navigate('/hr/requirements');
        return {
          ok: true,
          kind: 'hr',
          duplicate: res.duplicate,
          message: res.duplicate ? 'This lead is already in HR Management.' : 'Requirement sent to HR Management.',
        };
      }
      // HR salesperson: open the pre-filled create form (Client auto,
      // Position entered manually) — the requirement is created on submit.
      navigate('/sales/hr-requirements', {
        state: { createFor: { salesEntryId: entry._id, clientName: entry.companyName || '' } },
      });
      return { ok: true, kind: 'hr' };
    }

    // Condition 1 — Relocation Business (Client Name only; Remarks left empty)
    const prefillBusiness = { client: entry.companyName || '' };
    const target = isAdmin() ? '/admin/business' : '/sales/business';
    navigate(target, { state: { prefillBusiness } });
    return { ok: true, kind: 'business' };
  };

  return run;
}
