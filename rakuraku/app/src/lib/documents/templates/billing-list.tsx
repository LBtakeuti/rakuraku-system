import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { BillingListDocumentData } from "@/lib/documents/types";
import { docStyles, FONT_GOTHIC, FONT_MINCHO } from "@/lib/documents/styles";
import {
  formatCurrency,
  formatDateJP,
  formatDateSlash,
} from "@/lib/documents/formatters";

const s = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  companyName: { fontSize: 9, fontFamily: FONT_GOTHIC },
  title: {
    fontFamily: FONT_MINCHO,
    fontSize: 14,
    letterSpacing: 2,
    textAlign: "center",
  },
  meta: { fontSize: 8, textAlign: "right" },
  closingLine: { fontSize: 9, marginBottom: 4 },

  table: {
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderColor: "#000",
  },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
    minHeight: 24,
  },
  tdRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 18,
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 0.6,
    borderColor: "#000",
    backgroundColor: "#fef3c7",
    minHeight: 22,
  },
  th: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 6.5,
  },
  thLast: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 6.5,
  },
  td: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderRightWidth: 0.4,
    borderColor: "#9ca3af",
    justifyContent: "center",
    fontSize: 7,
  },
  tdLast: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    justifyContent: "center",
    fontSize: 7,
  },
  cCode: { width: "5.5%", alignItems: "center" },
  cName: { width: "16%" },
  cTaxType: { width: "4%", alignItems: "center" },
  cCount: { width: "5%", alignItems: "center" },
  cDue: { width: "7%", alignItems: "center" },
  cPrev: { width: "8%", alignItems: "flex-end" },
  cPay: { width: "8%", alignItems: "flex-end" },
  cCarry: { width: "7.5%", alignItems: "flex-end" },
  cSub: { width: "8%", alignItems: "flex-end" },
  cTax: { width: "7%", alignItems: "flex-end" },
  cTotal: { width: "8%", alignItems: "flex-end" },
  cDue2: { width: "8%", alignItems: "flex-end" },
  cCurrent: { width: "8%", alignItems: "flex-end" },
});

export function BillingListPdf({ data }: { data: BillingListDocumentData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={docStyles.pageLandscape}>
        <View style={s.headerRow}>
          <Text style={s.companyName}>{data.company.companyName}</Text>
          <Text style={s.title}>請　求　一　覧　表　（請求済）</Text>
          <View>
            <Text style={s.meta}>作成年月日: {formatDateJP(data.issueDate)}</Text>
          </View>
        </View>

        <Text style={s.closingLine}>
          {formatDateJP(data.periodTo)} 締（期間: {formatDateSlash(data.periodFrom)}
          〜{formatDateSlash(data.periodTo)}）
        </Text>

        <View style={s.table}>
          <View style={s.thRow}>
            <View style={[s.th, s.cCode]}>
              <Text>得意先{"\n"}コード</Text>
            </View>
            <View style={[s.th, s.cName]}>
              <Text>得意先名</Text>
            </View>
            <View style={[s.th, s.cTaxType]}>
              <Text>区分</Text>
            </View>
            <View style={[s.th, s.cCount]}>
              <Text>売上{"\n"}伝票数</Text>
            </View>
            <View style={[s.th, s.cDue]}>
              <Text>回収予定日</Text>
            </View>
            <View style={[s.th, s.cPrev]}>
              <Text>前回請求</Text>
            </View>
            <View style={[s.th, s.cPay]}>
              <Text>入金</Text>
            </View>
            <View style={[s.th, s.cCarry]}>
              <Text>繰越</Text>
            </View>
            <View style={[s.th, s.cSub]}>
              <Text>売上</Text>
            </View>
            <View style={[s.th, s.cTax]}>
              <Text>消費税</Text>
            </View>
            <View style={[s.th, s.cTotal]}>
              <Text>御買上金額</Text>
            </View>
            <View style={[s.thLast, s.cCurrent]}>
              <Text>今回請求</Text>
            </View>
          </View>

          {data.rows.map((row) => (
            <View key={row.customerCode} style={s.tdRow}>
              <View style={[s.td, s.cCode]}>
                <Text>{row.customerCode}</Text>
              </View>
              <View style={[s.td, s.cName]}>
                <Text>{row.customerName}</Text>
              </View>
              <View style={[s.td, s.cTaxType]}>
                <Text>{labelForTaxType(row.invoiceTaxType)}</Text>
              </View>
              <View style={[s.td, s.cCount]}>
                <Text>{row.invoiceCount}</Text>
              </View>
              <View style={[s.td, s.cDue]}>
                <Text>{row.paymentDueDate ? formatDateSlash(row.paymentDueDate) : "—"}</Text>
              </View>
              <View style={[s.td, s.cPrev]}>
                <Text>{formatCurrency(row.previousBalance)}</Text>
              </View>
              <View style={[s.td, s.cPay]}>
                <Text>{formatCurrency(row.paymentAmount)}</Text>
              </View>
              <View style={[s.td, s.cCarry]}>
                <Text>{formatCurrency(row.carryOver)}</Text>
              </View>
              <View style={[s.td, s.cSub]}>
                <Text>{formatCurrency(row.currentSubtotal)}</Text>
              </View>
              <View style={[s.td, s.cTax]}>
                <Text>{formatCurrency(row.currentTax)}</Text>
              </View>
              <View style={[s.td, s.cTotal]}>
                <Text>{formatCurrency(row.currentTotal)}</Text>
              </View>
              <View style={[s.tdLast, s.cCurrent]}>
                <Text>{formatCurrency(row.totalDue)}</Text>
              </View>
            </View>
          ))}

          <View style={s.totalRow}>
            <View style={[s.td, s.cCode]}>
              <Text>　</Text>
            </View>
            <View style={[s.td, s.cName]}>
              <Text>総合計</Text>
            </View>
            <View style={[s.td, s.cTaxType]}>
              <Text>　</Text>
            </View>
            <View style={[s.td, s.cCount]}>
              <Text>{data.totals.invoiceCount}</Text>
            </View>
            <View style={[s.td, s.cDue]}>
              <Text>　</Text>
            </View>
            <View style={[s.td, s.cPrev]}>
              <Text>{formatCurrency(data.totals.previousBalance)}</Text>
            </View>
            <View style={[s.td, s.cPay]}>
              <Text>{formatCurrency(data.totals.paymentAmount)}</Text>
            </View>
            <View style={[s.td, s.cCarry]}>
              <Text>{formatCurrency(data.totals.carryOver)}</Text>
            </View>
            <View style={[s.td, s.cSub]}>
              <Text>{formatCurrency(data.totals.currentSubtotal)}</Text>
            </View>
            <View style={[s.td, s.cTax]}>
              <Text>{formatCurrency(data.totals.currentTax)}</Text>
            </View>
            <View style={[s.td, s.cTotal]}>
              <Text>{formatCurrency(data.totals.currentTotal)}</Text>
            </View>
            <View style={[s.tdLast, s.cCurrent]}>
              <Text>{formatCurrency(data.totals.totalDue)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function labelForTaxType(invoiceTaxType: string): string {
  switch (invoiceTaxType) {
    case "per_line":
      return "明細";
    case "per_voucher":
      return "伝票";
    case "per_invoice":
      return "請求";
    default:
      return "—";
  }
}
