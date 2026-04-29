import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.25,
  },
  header: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 12,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Times-Bold',
    lineHeight: 1.15,
    marginBottom: 3,
  },
  address: {
    fontSize: 8.5,
    lineHeight: 1.25,
    maxWidth: 470,
  },
  title: {
    marginTop: 8,
    marginBottom: 14,
    textAlign: 'center',
    fontSize: 10.5,
    fontFamily: 'Times-Bold',
  },
  infoTable: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoCell: {
    borderRightWidth: 1,
    borderRightColor: '#9ca3af',
    paddingVertical: 4,
    paddingHorizontal: 5,
    minHeight: 24,
    justifyContent: 'center',
  },
  infoLabelCell: {
    width: '15%',
  },
  infoValueCell: {
    width: '35%',
  },
  infoRightLabelCell: {
    width: '15%',
  },
  infoRightValueCell: {
    width: '35%',
    borderRightWidth: 0,
  },
  labelText: {
    fontSize: 9.5,
  },
  valueText: {
    fontSize: 9.5,
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCell: {
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#9ca3af',
    minHeight: 22,
    justifyContent: 'center',
  },
  earnLabelCell: {
    width: '38%',
  },
  earnAmountCell: {
    width: '12%',
  },
  deductLabelCell: {
    width: '38%',
  },
  deductAmountCell: {
    width: '12%',
    borderRightWidth: 0,
  },
  summaryHeadText: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
  },
  amountText: {
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
  },
  totalText: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
  },
  netPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  netPayLabel: {
    fontSize: 10,
  },
  netPayValue: {
    fontSize: 10,
    fontFamily: 'Times-Bold',
  },
  words: {
    marginTop: 10,
    fontSize: 9.5,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 8.8,
    color: '#6b7280',
  },
});

function ensureRows(rows: any[] = [], minRows = 3) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const count = Math.max(minRows, safeRows.length);

  return Array.from({ length: count }, (_, index) => safeRows[index] || { label: '', displayAmount: '' });
}

export default function PayrollPdfDocument({ snapshot }: { snapshot: any }) {
  const header = snapshot?.header || {};
  const meta = snapshot?.meta || {};
  const detailColumns = snapshot?.detailColumns || { left: [], right: [] };
  const earningsRows = snapshot?.earningsRows || [];
  const deductionRows = snapshot?.deductionRows || [];
  const totals = snapshot?.totals || {};

  const rowCount = Math.max(earningsRows.length, deductionRows.length, 3);
  const safeEarningsRows = ensureRows(earningsRows, rowCount);
  const safeDeductionRows = ensureRows(deductionRows, rowCount);
  const detailRowCount = Math.max(detailColumns.left?.length || 0, detailColumns.right?.length || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{header.companyName || ''}</Text>
          <Text style={styles.address}>{header.addressLine || ''}</Text>
        </View>

        <Text style={styles.title}>Payslip for the month of {meta.monthLabel || ''}</Text>

        <View style={styles.infoTable}>
          {Array.from({ length: detailRowCount }, (_, index) => {
            const left = detailColumns.left?.[index] || { label: '', value: '' };
            const right = detailColumns.right?.[index] || { label: '', value: '' };

            return (
              <View key={`info-${index}`} style={styles.infoRow}>
                <View style={[styles.infoCell, styles.infoLabelCell]}>
                  <Text style={styles.labelText}>{left.label ? `${left.label}:` : ''}</Text>
                </View>
                <View style={[styles.infoCell, styles.infoValueCell]}>
                  <Text style={styles.valueText}>{left.value || ''}</Text>
                </View>
                <View style={[styles.infoCell, styles.infoRightLabelCell]}>
                  <Text style={styles.labelText}>{right.label ? `${right.label}:` : ''}</Text>
                </View>
                <View style={[styles.infoCell, styles.infoRightValueCell]}>
                  <Text style={styles.valueText}>{right.value || ''}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.summaryTable}>
          <View style={styles.summaryHeaderRow}>
            <View style={[styles.summaryCell, styles.earnLabelCell]}>
              <Text style={styles.summaryHeadText}>Earnings</Text>
            </View>
            <View style={[styles.summaryCell, styles.earnAmountCell]}>
              <Text style={[styles.summaryHeadText, styles.amountText]}>Amount</Text>
            </View>
            <View style={[styles.summaryCell, styles.deductLabelCell]}>
              <Text style={styles.summaryHeadText}>Deductions</Text>
            </View>
            <View style={[styles.summaryCell, styles.deductAmountCell]}>
              <Text style={[styles.summaryHeadText, styles.amountText]}>Amount</Text>
            </View>
          </View>

          {safeEarningsRows.map((earningRow, index) => {
            const deductionRow = safeDeductionRows[index] || { label: '', displayAmount: '' };

            return (
              <View key={`summary-${index}`} style={styles.summaryRow}>
                <View style={[styles.summaryCell, styles.earnLabelCell]}>
                  <Text>{earningRow.label || ''}</Text>
                </View>
                <View style={[styles.summaryCell, styles.earnAmountCell]}>
                  <Text style={styles.amountText}>{earningRow.displayAmount || ''}</Text>
                </View>
                <View style={[styles.summaryCell, styles.deductLabelCell]}>
                  <Text>{deductionRow.label || ''}</Text>
                </View>
                <View style={[styles.summaryCell, styles.deductAmountCell]}>
                  <Text style={styles.amountText}>{deductionRow.displayAmount || ''}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <View style={[styles.summaryCell, styles.earnLabelCell]}>
              <Text style={styles.totalText}>Total Earnings:INR.</Text>
            </View>
            <View style={[styles.summaryCell, styles.earnAmountCell]}>
              <Text style={[styles.totalText, styles.amountText]}>{totals.totalEarningsDisplay || ''}</Text>
            </View>
            <View style={[styles.summaryCell, styles.deductLabelCell]}>
              <Text style={styles.totalText}>Total Deductions:INR.</Text>
            </View>
            <View style={[styles.summaryCell, styles.deductAmountCell]}>
              <Text style={[styles.totalText, styles.amountText]}>{totals.totalDeductionsDisplay || ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netPayRow}>
          <Text style={styles.netPayLabel}>Net Pay for the month :</Text>
          <Text style={styles.netPayValue}>{totals.netSalaryDisplay || ''}</Text>
        </View>

        <Text style={styles.words}>({totals.netSalaryWords || ''})</Text>

        <Text style={styles.footer}>This is a system generated payslip and does not require signature.</Text>
      </Page>
    </Document>
  );
}
