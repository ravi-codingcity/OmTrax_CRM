// The company's own identity as printed on outgoing documents.
//
// Taken from the reference Purchase Order (src/assets/PO Format.docx). None of
// this is stored in the CRM — a PO has no billing-branch link, and branches
// carry no GST number — so it lives here, in one place, rather than being
// scattered through the PDF code. Update it here if the billing branch or GST
// registration changes.
export const COMPANY = {
  // Used in the signature block: "For OM TRAX PACKAGING SOLUTIONS LIMITED"
  legalName: 'OM TRAX PACKAGING SOLUTIONS LIMITED',
  // Used in the Bill To / Ship To cells
  displayName: 'Om Trax Packaging Solutions Ltd.',
  billing: {
    address: '159, Transport Centre, Near Punjabi Bagh, New Delhi - 110035',
    gstNumber: '07AAACO9628D1ZG',
  },
};
