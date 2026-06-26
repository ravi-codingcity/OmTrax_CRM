import { useState } from 'react';
import { RECRUITERS, SALES_PERSONS, FEEDBACK_OPTIONS, isRecruiter, isHrAdmin, isTeamLeader } from '../../config/hr';
import SearchableSelect from '../Common/SearchableSelect';

const toDateInput = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
};

const RecruitmentModal = ({ mode = 'add', entry = null, currentUser, recruiterOptions = [], onClose, onSubmit }) => {
  const isEdit = mode === 'edit';
  const recruiterView = isRecruiter(currentUser);
  const admin = isHrAdmin(currentUser);
  const teamLeader = isTeamLeader(currentUser);

  const canAssign = admin || teamLeader;                          // assignment fields
  // Admins have full authority (can fill recruiter fields even when creating)
  const showRecruiterData = admin || (isEdit && recruiterView);   // CV/feedback/remarks

  const recruiterNames = recruiterOptions.length ? recruiterOptions.map((r) => r.name) : RECRUITERS;

  const [form, setForm] = useState({
    salesPersonName: entry?.salesPersonName || '',
    clientName: entry?.clientName || '',
    position: entry?.position || '',
    recruiterName: entry?.recruiterName || '',
    cvSubmissionDate: toDateInput(entry?.cvSubmissionDate),
    cvsSubmitted: entry?.cvsSubmitted ?? 0,
    feedback: entry?.feedback || 'Feedback Pending',
    remarks: entry?.remarks || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (canAssign) {
      if (!form.clientName.trim()) e.clientName = 'Required';
      if (!form.position.trim()) e.position = 'Required';
      if (!form.recruiterName) e.recruiterName = 'Select a recruiter';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    const payload = {};
    if (canAssign) {
      payload.salesPersonName = form.salesPersonName.trim();
      payload.clientName = form.clientName.trim();
      payload.position = form.position.trim();
      payload.recruiterName = form.recruiterName;
    }
    if (showRecruiterData) {
      payload.cvSubmissionDate = form.cvSubmissionDate || null;
      payload.cvsSubmitted = Math.max(0, parseInt(form.cvsSubmitted, 10) || 0);
      payload.feedback = form.feedback;
      payload.remarks = form.remarks;
    }

    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res?.success) onClose();
    else setApiError(res?.message || 'Something went wrong.');
  };

  const inputCls = (field) =>
    `w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

  const title = isEdit ? (recruiterView ? 'Update Submission' : 'Edit Position') : 'Assign Position';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{apiError}</div>
          )}

          {/* Assignment block */}
          {canAssign ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Sales Person</label>
                <SearchableSelect
                  value={form.salesPersonName}
                  onChange={(v) => setField('salesPersonName', v)}
                  options={SALES_PERSONS}
                  placeholder="Search or type"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Assign to Recruiter <span className="text-red-500">*</span></label>
                <select value={form.recruiterName} onChange={(e) => setField('recruiterName', e.target.value)} className={inputCls('recruiterName')}>
                  <option value="">Select recruiter</option>
                  {recruiterNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {errors.recruiterName && <p className="text-red-500 text-[11px] mt-0.5">{errors.recruiterName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Client <span className="text-red-500">*</span></label>
                <input value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} className={inputCls('clientName')} placeholder="Client" />
                {errors.clientName && <p className="text-red-500 text-[11px] mt-0.5">{errors.clientName}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Position <span className="text-red-500">*</span></label>
                <input value={form.position} onChange={(e) => setField('position', e.target.value)} className={inputCls('position')} placeholder="Position" />
                {errors.position && <p className="text-red-500 text-[11px] mt-0.5">{errors.position}</p>}
              </div>
            </div>
          ) : (
            // Read-only reference for recruiters
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div><span className="text-gray-500">Sales Person:</span> <span className="font-medium text-gray-800">{entry?.salesPersonName || '—'}</span></div>
              <div><span className="text-gray-500">Position Received:</span> <span className="font-medium text-gray-800">{fmtDate(entry?.positionReceivedDate)}</span></div>
              <div><span className="text-gray-500">Assign Date:</span> <span className="font-medium text-gray-800">{fmtDate(entry?.assignDate)}</span></div>
              <div><span className="text-gray-500">Client:</span> <span className="font-medium text-gray-800">{entry?.clientName}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Position:</span> <span className="font-medium text-gray-800">{entry?.position}</span></div>
            </div>
          )}

          {/* Recruiter-owned data */}
          {showRecruiterData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">CV Submission Date</label>
                <input type="date" value={form.cvSubmissionDate} onChange={(e) => setField('cvSubmissionDate', e.target.value)} className={inputCls('cvSubmissionDate')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">No. of CVs Submitted</label>
                <input type="number" min="0" value={form.cvsSubmitted} onChange={(e) => setField('cvsSubmitted', e.target.value)} className={inputCls('cvsSubmitted')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Feedback</label>
                <select value={form.feedback} onChange={(e) => setField('feedback', e.target.value)} className={inputCls('feedback')}>
                  {FEEDBACK_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setField('remarks', e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Notes..."
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
              {submitting ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : isEdit ? 'Save' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecruitmentModal;
