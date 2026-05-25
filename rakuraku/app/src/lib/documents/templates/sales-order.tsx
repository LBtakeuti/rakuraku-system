import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { SalesOrderDocumentData } from "@/lib/documents/types";
import { docStyles, FONT_GOTHIC } from "@/lib/documents/styles";
import { CompanyInfoBlock } from "@/lib/documents/components/page-header";
import {
  formatCurrency,
  formatDateJP,
} from "@/lib/documents/formatters";

const s = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  leftCol: { width: "55%" },
  rightCol: { width: "42%", alignItems: "flex-end" },
  customerCode: { fontSize: 9, marginBottom: 2 },
  customerName: {
    fontFamily: FONT_GOTHIC,
    fontSize: 13,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 0.6,
    borderColor: "#000",
  },
  meta: { fontSize: 8, marginBottom: 1 },
  voucherMeta: { fontSize: 9, marginBottom: 2 },
  table: {
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderColor: "#000",
    marginTop: 6,
  },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
    minHeight: 22,
  },
  tdRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 30,
  },
  emptyRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#e5e7eb",
    minHeight: 20,
  },
  th: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 8,
  },
  thLast: {
    paddingHorizontal: 3,
    paddingVertical: 3,
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
  cNo: { width: "6%", alignItems: "center" },
  cName: { width: "32%" },
  cUnits: { width: "10%", alignItems: "center" },
  cQty: { width: "10%", alignItems: "flex-end" },
  cPrice: { width: "12%", alignItems: "flex-end" },
  cAmount: { width: "14%", alignItems: "flex-end" },
  cPoNo: { width: "16%", alignItems: "center" },
  productCodeJan: { fontSize: 7, color: "#374151" },
  productName: { fontSize: 9 },
  totalsBox: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "55%",
    borderWidth: 0.6,
    borderColor: "#000",
  },
  totalsRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 22,
  },
  totalsLabel: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 0.4,
    borderColor: "#9ca3af",
    justifyContent: "center",
    fontSize: 9,
  },
  totalsValue: {
    width: 110,
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "flex-end",
    fontSize: 9,
  },
  noteRow: {
    flexDirection: "row",
    marginTop: 8,
    alignItems: "center",
    fontSize: 9,
  },
  noteLabel: { width: 40 },
  noteLine: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderColor: "#000",
    height: 16,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
});

const EMPTY_ROW_COUNT = 14;

export function SalesOrderPdf({ data }: { data: SalesOrderDocumentData }) {
  const emptyRows = Math.max(0, EMPTY_ROW_COUNT - data.lines.length);

  return (
    <Document>
      <Page size="A4" style={docStyles.page}>
        <View style={docStyles.titleBox}>
          <Text style={docStyles.title}>受 注 伝 票</Text>
        </View>

        <View style={s.headerRow}>
          <View style={s.leftCol}>
            <Text style={s.customerCode}>{data.customer.customerCode}</Text>
            <Text style={s.customerName}>{data.customer.name}　様</Text>
            {data.deliveryAddress?.name ? (
              <Text style={s.meta}>送り先: {data.deliveryAddress.name}</Text>
            ) : null}
            {data.deliveryAddress?.postalCode ? (
              <Text style={s.meta}>〒{data.deliveryAddress.postalCode}</Text>
            ) : null}
            {data.deliveryAddress?.address ? (
              <Text style={s.meta}>{data.deliveryAddress.address}</Text>
            ) : null}
            {data.deliveryAddress?.phone ? (
              <Text style={s.meta}>TEL: {data.deliveryAddress.phone}</Text>
            ) : null}
            <Text style={s.meta}>送り主: {data.company.companyName}</Text>
          </View>

          <View style={s.rightCol}>
            <Text style={s.voucherMeta}>伝票番号: {data.orderNo}</Text>
            <Text style={s.voucherMeta}>
              伝票日付: {formatDateJP(data.orderDate)}
            </Text>
            <View style={{ height: 6 }} />
            <CompanyInfoBlock
              company={data.company}
              showBankInfo={false}
              showRegistrationNo={false}
            />
          </View>
        </View>

        <View style={s.table}>
          <View style={s.thRow}>
            <View style={[s.th, s.cNo]}>
              <Text>No.</Text>
            </View>
            <View style={[s.th, s.cName]}>
              <Text>商品名</Text>
            </View>
            <View style={[s.th, s.cUnits]}>
              <Text>入数{"\n"}ケース</Text>
            </View>
            <View style={[s.th, s.cQty]}>
              <Text>発注数量</Text>
            </View>
            <View style={[s.th, s.cPrice]}>
              <Text>単価</Text>
            </View>
            <View style={[s.th, s.cAmount]}>
              <Text>売上金額</Text>
            </View>
            <View style={[s.thLast, s.cPoNo]}>
              <Text>発注番号{"\n"}備考</Text>
            </View>
          </View>

          {data.lines.map((line) => (
            <View key={line.lineNo} style={s.tdRow}>
              <View style={[s.td, s.cNo]}>
                <Text>{String(line.lineNo).padStart(3, "0")}</Text>
              </View>
              <View style={[s.td, s.cName]}>
                <Text style={s.productCodeJan}>
                  {line.productCode}
                  {line.janCode ? `　${line.janCode}` : ""}
                </Text>
                <Text style={s.productName}>{line.productName}</Text>
              </View>
              <View style={[s.td, s.cUnits]}>
                <Text>{line.unitsPerCase}</Text>
                <Text>{line.caseCount > 0 ? line.caseCount : "-"}</Text>
              </View>
              <View style={[s.td, s.cQty]}>
                <Text>{formatCurrency(line.quantity)}</Text>
              </View>
              <View style={[s.td, s.cPrice]}>
                <Text>{formatCurrency(line.unitPrice)}</Text>
              </View>
              <View style={[s.td, s.cAmount]}>
                <Text>{formatCurrency(line.amount)}</Text>
              </View>
              <View style={[s.tdLast, s.cPoNo]}>
                <Text style={s.productCodeJan}>
                  {line.linkedPurchaseOrderNo ?? ""}
                </Text>
                {line.note ? (
                  <Text style={s.productCodeJan}>{line.note}</Text>
                ) : null}
              </View>
            </View>
          ))}

          {Array.from({ length: emptyRows }).map((_, idx) => (
            <View key={`empty-${idx}`} style={s.emptyRow}>
              <View style={[s.td, s.cNo]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cName]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cUnits]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cQty]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cPrice]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cAmount]}>
                <Text> </Text>
              </View>
              <View style={[s.tdLast, s.cPoNo]}>
                <Text> </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.totalsBox}>
          <View style={s.totalsRow}>
            <View style={s.totalsLabel}>
              <Text>合計：</Text>
            </View>
            <View style={s.totalsValue}>
              <Text>{formatCurrency(data.subtotal)}</Text>
            </View>
          </View>
          <View style={s.totalsRow}>
            <View style={s.totalsLabel}>
              <Text>消費税額：</Text>
            </View>
            <View style={s.totalsValue}>
              <Text>{formatCurrency(data.taxAmount)}</Text>
            </View>
          </View>
          <View style={s.totalsRow}>
            <View style={s.totalsLabel}>
              <Text>総合計：</Text>
            </View>
            <View style={s.totalsValue}>
              <Text>{formatCurrency(data.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={s.noteRow}>
          <Text style={s.noteLabel}>摘要:</Text>
          <View style={s.noteLine}>
            <Text>{data.note ?? ""}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
