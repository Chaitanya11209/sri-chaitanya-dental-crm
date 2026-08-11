import { supabase, isSupabaseConfigured } from './supabase';

export interface FinancialMismatch {
  id: string;
  type: 'INVOICE_BALANCE_MISMATCH' | 'UNLINKED_PAYMENT' | 'OVERPAYMENT' | 'INVOICE_WITHOUT_PATIENT';
  invoiceId?: string;
  patientName?: string;
  details: string;
  amountExpected?: number;
  amountFound?: number;
}

export interface PatientIntegrityIssue {
  id: string;
  type: 'MISSING_PATIENT_CODE' | 'DUPLICATE_PATIENT_CODE' | 'ORPHAN_APPOINTMENT' | 'ORPHAN_TREATMENT' | 'INVALID_DOCTOR';
  patientId?: string;
  patientName?: string;
  details: string;
}

export interface SystemDiagnosticReport {
  timestamp: string;
  financialIssues: FinancialMismatch[];
  patientIssues: PatientIntegrityIssue[];
  summary: {
    totalInvoicesChecked: number;
    financialDiscrepanciesCount: number;
    totalPatientsChecked: number;
    patientDiscrepanciesCount: number;
    status: 'HEALTHY' | 'DISCREPANCIES_FOUND';
  };
}

/**
 * Executes non-destructive diagnostic queries against active database records
 * to detect financial balance mismatches and patient entity anomalies.
 */
export async function runSystemDataDiagnostics(): Promise<SystemDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const financialIssues: FinancialMismatch[] = [];
  const patientIssues: PatientIntegrityIssue[] = [];

  let totalInvoicesChecked = 0;
  let totalPatientsChecked = 0;

  if (!isSupabaseConfigured) {
    return {
      timestamp,
      financialIssues: [],
      patientIssues: [],
      summary: {
        totalInvoicesChecked: 0,
        financialDiscrepanciesCount: 0,
        totalPatientsChecked: 0,
        patientDiscrepanciesCount: 0,
        status: 'HEALTHY'
      }
    };
  }

  try {
    // 1. FINANCIAL RECONCILIATION DIAGNOSTICS
    // Query bills / invoices
    const { data: bills, error: billsErr } = await supabase
      .from('bills')
      .select('id, invoice_number, patient_name, total_amount, amount_paid, balance, patient_id');

    if (!billsErr && bills) {
      totalInvoicesChecked = bills.length;

      // Query payments if payments table exists
      const { data: payments } = await supabase
        .from('payments')
        .select('id, bill_id, amount, patient_id');

      const paymentTotalsByBill: Record<string, number> = {};
      if (payments) {
        payments.forEach((p) => {
          if (p.bill_id) {
            paymentTotalsByBill[p.bill_id] = (paymentTotalsByBill[p.bill_id] || 0) + Number(p.amount || 0);
          } else {
            financialIssues.push({
              id: `unlinked-pay-${p.id}`,
              type: 'UNLINKED_PAYMENT',
              details: `Payment ID #${p.id} of ₹${p.amount} is missing a linked Invoice reference.`
            });
          }
        });
      }

      bills.forEach((bill) => {
        const total = Number(bill.total_amount || 0);
        const paid = Number(bill.amount_paid || 0);
        const bal = Number(bill.balance || 0);
        const calculatedBal = total - paid;

        if (Math.abs(bal - calculatedBal) > 0.01) {
          financialIssues.push({
            id: `bal-mismatch-${bill.id}`,
            type: 'INVOICE_BALANCE_MISMATCH',
            invoiceId: bill.invoice_number || bill.id,
            patientName: bill.patient_name,
            details: `Invoice #${bill.invoice_number || bill.id} has recorded balance ₹${bal}, but Total (₹${total}) - Paid (₹${paid}) equals ₹${calculatedBal}.`,
            amountExpected: calculatedBal,
            amountFound: bal
          });
        }

        if (paid > total) {
          financialIssues.push({
            id: `overpay-${bill.id}`,
            type: 'OVERPAYMENT',
            invoiceId: bill.invoice_number || bill.id,
            patientName: bill.patient_name,
            details: `Invoice #${bill.invoice_number || bill.id} total is ₹${total}, but recorded paid amount is ₹${paid} (Overpayment of ₹${paid - total}).`,
            amountExpected: total,
            amountFound: paid
          });
        }

        if (!bill.patient_id && !bill.patient_name) {
          financialIssues.push({
            id: `no-patient-inv-${bill.id}`,
            type: 'INVOICE_WITHOUT_PATIENT',
            invoiceId: bill.invoice_number || bill.id,
            details: `Invoice #${bill.invoice_number || bill.id} is not linked to any patient entity.`
          });
        }
      });
    }

    // 2. PATIENT DATA INTEGRITY DIAGNOSTICS
    const { data: patients, error: patErr } = await supabase
      .from('patients')
      .select('id, name, patient_code, phone');

    if (!patErr && patients) {
      totalPatientsChecked = patients.length;
      const seenCodes = new Set<string>();

      patients.forEach((pat) => {
        if (!pat.patient_code || pat.patient_code.trim() === '') {
          patientIssues.push({
            id: `no-code-${pat.id}`,
            type: 'MISSING_PATIENT_CODE',
            patientId: pat.id,
            patientName: pat.name,
            details: `Patient "${pat.name}" (ID: ${pat.id}) is missing a standard registration patient_code.`
          });
        } else {
          const codeUpper = pat.patient_code.trim().toUpperCase();
          if (seenCodes.has(codeUpper)) {
            patientIssues.push({
              id: `dup-code-${pat.id}`,
              type: 'DUPLICATE_PATIENT_CODE',
              patientId: pat.id,
              patientName: pat.name,
              details: `Patient "${pat.name}" shares duplicate code "${codeUpper}" with another patient record.`
            });
          } else {
            seenCodes.add(codeUpper);
          }
        }
      });

      // Check orphan appointments
      const { data: appts } = await supabase.from('appointments').select('id, patient_name, patient_id, doctor_id');
      if (appts) {
        const patIdSet = new Set(patients.map((p) => p.id));
        appts.forEach((app) => {
          if (app.patient_id && !patIdSet.has(app.patient_id)) {
            patientIssues.push({
              id: `orphan-appt-${app.id}`,
              type: 'ORPHAN_APPOINTMENT',
              details: `Appointment ID #${app.id} for "${app.patient_name}" references patient_id "${app.patient_id}" which no longer exists.`
            });
          }
        });
      }

      // Check orphan treatments
      const { data: treatments } = await supabase.from('treatments').select('id, patient_name, patient_id');
      if (treatments) {
        const patIdSet = new Set(patients.map((p) => p.id));
        treatments.forEach((tx) => {
          if (tx.patient_id && !patIdSet.has(tx.patient_id)) {
            patientIssues.push({
              id: `orphan-tx-${tx.id}`,
              type: 'ORPHAN_TREATMENT',
              details: `Treatment ID #${tx.id} for "${tx.patient_name}" references patient_id "${tx.patient_id}" which no longer exists.`
            });
          }
        });
      }
    }
  } catch (err: any) {
    console.error('[System Diagnostics] Error running diagnostic check:', err);
  }

  const financialDiscrepanciesCount = financialIssues.length;
  const patientDiscrepanciesCount = patientIssues.length;

  return {
    timestamp,
    financialIssues,
    patientIssues,
    summary: {
      totalInvoicesChecked,
      financialDiscrepanciesCount,
      totalPatientsChecked,
      patientDiscrepanciesCount,
      status: (financialDiscrepanciesCount === 0 && patientDiscrepanciesCount === 0) ? 'HEALTHY' : 'DISCREPANCIES_FOUND'
    }
  };
}
