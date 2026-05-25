import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceDocumentData } from "@/lib/documents/types";
import { docStyles, FONT_GOTHIC } from "@/lib/documents/styles";
import { CompanyInfoBlock } from "@/lib/documents/components/page-header";
import {
  formatCurrency,
  formatCurrencyWithSymbol,
  formatDateJP,
  formatDateSlash,
  formatTaxRatePct,
} from "@/lib/documents/formatters";

const s = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  leftCol: { width: "55%" },
  rightCol: { width: "42%", alignItems: "flex-end" },
  postalLine: { fontSize: 8 },
  addressLine: { fontSize: 8, marginBottom: 4 },
  customerName: {
    fontFamily: FONT_GOTHIC,
    fontSize: 13,
    marginBottom: 3,
  },
  customerCode: { fontSize: 8, marginBottom: 4 },
  intro: { fontSize: 8.5, marginTop: 4 },
  closingLine: { fontSize: 9, marginBottom: 1 },
  dueLine: { fontSize: 9, marginBottom: 6 },

  summaryBand: {
    borderWidth: 0.6,
    borderColor: "#000",
    marginTop: 6,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
  },
  summaryCol: {
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 7.5,
  },
  summaryColLast: {
    paddingHorizontal: 3,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 7.5,
  },
  summaryCellRow: {
    flexDirection: "row",
    minHeight: 22,
  },
  summaryValueCol: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "flex-end",
    fontSize: 8.5,
  },
  summaryValueColLast: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: "center",
    alignItems: "flex-end",
    fontSize: 10,
    fontFamily: FONT_GOTHIC,
  },
  cBalance: { width: "11%" },
  cPayment: { width: "11%" },
  cCarry: { width: "11%" },
  cRate: { width: "9%" },
  cSubtotal: { width: "13%" },
  cTax: { width: "12%" },
  cCurrent: { width: "13%" },
  cTotal: { width: "20%" },

  taxRow: {
    flexDirection: "row",
    minHeight: 16,
    borderTopWidth: 0.3,
    borderColor: "#9ca3af",
  },
  taxCol: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 7,
  },
  taxColValue: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "flex-end",
    fontSize: 7.5,
  },

  detailTable: {
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderColor: "#000",
  },
  detailThRow: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
  },
  detailTdRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 22,
  },
  detailEmptyRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#e5e7eb",
    minHeight: 18,
  },
  th: {
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 8,
  },
  thLast: {
    paddingHorizontal: 3,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 8,
  },
  td: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRightWidth: 0.4,
    borderColor: "#9ca3af",
    justifyContent: "center",
  },
  tdLast: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: "center",
  },
  cDate: { width: "12%", alignItems: "center" },
  cInvNo: { width: "14%", alignItems: "center" },
  cItem: { width: "40%" },
  cQty: { width: "10%", alignItems: "flex-end" },
  cPrice: { width: "10%", alignItems: "flex-end" },
  cAmount: { width: "14%", alignItems: "flex-end" },
  itemLine: { fontSize: 8.5 },
  itemNote: { fontSize: 7.5, color: "#374151" },
  footerNote: { fontSize: 7, marginTop: 8, color: "#4b5563" },
});

const EMPTY_DETAIL_ROW_COUNT = 14;

export function InvoicePdf({ data }: { data: InvoiceDocumentData }) {
  const emptyRows = Math.max(
    0,
    EMPTY_DETAIL_ROW_COUNT - data.detailLines.length
  );

  const breakdown10 = data.taxBreakdown.find(
    (b) => Math.abs(b.taxRate - 0.1) < 1e-9
  );
  const breakdown8 = data.taxBreakdown.find(
    (b) => Math.abs(b.taxRate - 0.08) < 1e-9
  );

  return (
    <Document>
      <Page size="A4" style={docStyles.page}>
        <View style={docStyles.titleBox}>
          <Text style={docStyles.title}>請　求　書</Text>
        </View>

        <View style={s.headerRow}>
          <View style={s.leftCol}>
            {data.customer.postalCode ? (
              <Text style={s.postalLine}>〒{data.customer.postalCode}</Text>
            ) : null}
            {data.customer.address ? (
              <Text style={s.addressLine}>{data.customer.address}</Text>
            ) : null}
            <Text style={s.customerName}>{data.customer.name}　様</Text>
            <Text style={s.customerCode}>
              お客様コードNo.{data.customer.customerCode}
            </Text>
            <Text style={s.intro}>
              毎度ありがとうございます。下記の通りご請求申し上げます。
            </Text>
          </View>

          <View style={s.rightCol}>
            <Text style={s.closingLine}>
              {formatDateJP(data.periodTo)} 締
            </Text>
            {data.dueDate ? (
              <Text style={s.dueLine}>
                お支払期限: {formatDateJP(data.dueDate)}
              </Text>
            ) : null}
            <CompanyInfoBlock company={data.company} />
          </View>
        </View>

        <View style={s.summaryBand}>
          <View style={s.summaryHeader}>
            <View style={[s.summaryCol, s.cBalance]}>
              <Text>前回御請求額</Text>
            </View>
            <View style={[s.summaryCol, s.cPayment]}>
              <Text>御入金額</Text>
            </View>
            <View style={[s.summaryCol, s.cCarry]}>
              <Text>繰越金額</Text>
            </View>
            <View style={[s.summaryCol, s.cRate]}>
              <Text>税率</Text>
            </View>
            <View style={[s.summaryCol, s.cSubtotal]}>
              <Text>御買上額</Text>
            </View>
            <View style={[s.summaryCol, s.cTax]}>
              <Text>消費税額</Text>
            </View>
            <View style={[s.summaryCol, s.cCurrent]}>
              <Text>御買上計</Text>
            </View>
            <View style={[s.summaryColLast, s.cTotal]}>
              <Text>今回御請求額</Text>
            </View>
          </View>

          <View style={s.summaryCellRow}>
            <View style={[s.summaryValueCol, s.cBalance]}>
              <Text>{formatCurrency(data.previousBalance)}</Text>
            </View>
            <View style={[s.summaryValueCol, s.cPayment]}>
              <Text>{formatCurrency(data.paymentAmount)}</Text>
            </View>
            <View style={[s.summaryValueCol, s.cCarry]}>
              <Text>{formatCurrency(data.carryOver)}</Text>
            </View>
            <View style={[s.summaryValueCol, s.cRate]}>
              <View>
                <Text style={{ fontSize: 7.5 }}>
                  {formatTaxRatePct(breakdown10?.taxRate ?? 0.1)}
                </Text>
                <Text style={{ fontSize: 7.5 }}>
                  {formatTaxRatePct(breakdown8?.taxRate ?? 0.08)}
                </Text>
              </View>
            </View>
            <View style={[s.summaryValueCol, s.cSubtotal]}>
              <View>
                <Text style={{ fontSize: 7.5 }}>
                  {formatCurrency(breakdown10?.subtotal ?? 0)}
                </Text>
                <Text style={{ fontSize: 7.5 }}>
                  {formatCurrency(breakdown8?.subtotal ?? 0)}
                </Text>
              </View>
            </View>
            <View style={[s.summaryValueCol, s.cTax]}>
              <View>
                <Text style={{ fontSize: 7.5 }}>
                  {formatCurrency(breakdown10?.taxAmount ?? 0)}
                </Text>
                <Text style={{ fontSize: 7.5 }}>
                  {formatCurrency(breakdown8?.taxAmount ?? 0)}
                </Text>
              </View>
            </View>
            <View style={[s.summaryValueCol, s.cCurrent]}>
              <Text>{formatCurrency(data.currentTotal)}</Text>
            </View>
            <View style={[s.summaryValueColLast, s.cTotal]}>
              <Text>{formatCurrencyWithSymbol(data.totalDue)}</Text>
            </View>
          </View>
        </View>

        <View style={s.detailTable}>
          <View style={s.detailThRow}>
            <View style={[s.th, s.cDate]}>
              <Text>伝票日付</Text>
            </View>
            <View style={[s.th, s.cInvNo]}>
              <Text>伝票No.</Text>
            </View>
            <View style={[s.th, s.cItem]}>
              <Text>品番・品名</Text>
            </View>
            <View style={[s.th, s.cQty]}>
              <Text>数量</Text>
            </View>
            <View style={[s.th, s.cPrice]}>
              <Text>単価</Text>
            </View>
            <View style={[s.thLast, s.cAmount]}>
              <Text>御買上額</Text>
            </View>
          </View>

          {data.detailLines.map((line, idx) => (
            <View key={`${line.invoiceNo}-${idx}`} style={s.detailTdRow}>
              <View style={[s.td, s.cDate]}>
                <Text style={s.itemLine}>{formatDateSlash(line.invoiceDate)}</Text>
              </View>
              <View style={[s.td, s.cInvNo]}>
                <Text style={s.itemLine}>{line.invoiceNo}</Text>
              </View>
              <View style={[s.td, s.cItem]}>
                <Text style={s.itemLine}>
                  {line.productCode} {line.productName}
                </Text>
                {line.deliveryNote ? (
                  <Text style={s.itemNote}>{line.deliveryNote}</Text>
                ) : null}
              </View>
              <View style={[s.td, s.cQty]}>
                <Text style={s.itemLine}>{formatCurrency(line.quantity)}</Text>
              </View>
              <View style={[s.td, s.cPrice]}>
                <Text style={s.itemLine}>{formatCurrency(line.unitPrice)}</Text>
              </View>
              <View style={[s.tdLast, s.cAmount]}>
                <Text style={s.itemLine}>{formatCurrency(line.amount)}</Text>
              </View>
            </View>
          ))}

          {Array.from({ length: emptyRows }).map((_, idx) => (
            <View key={`empty-${idx}`} style={s.detailEmptyRow}>
              <View style={[s.td, s.cDate]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cInvNo]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cItem]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cQty]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cPrice]}>
                <Text> </Text>
              </View>
              <View style={[s.tdLast, s.cAmount]}>
                <Text> </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.footerNote}>
          インボイス制度開始に伴い各種手数料は貴社ご負担にてお願い致します。
        </Text>
      </Page>
    </Document>
  );
}
