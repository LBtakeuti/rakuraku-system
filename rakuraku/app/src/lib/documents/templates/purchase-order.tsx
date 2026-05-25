import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PurchaseOrderDocumentData } from "@/lib/documents/types";
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
  leftCol: {
    width: "55%",
  },
  rightCol: {
    width: "42%",
    alignItems: "flex-end",
  },
  supplierName: {
    fontFamily: FONT_GOTHIC,
    fontSize: 13,
    marginBottom: 4,
  },
  smallLine: { fontSize: 8, marginBottom: 1 },
  voucherMeta: { fontSize: 9, marginBottom: 2 },
  deadlineEmphasis: {
    fontSize: 13,
    fontFamily: FONT_GOTHIC,
    marginTop: 6,
  },
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
  },
  tdRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 28,
  },
  emptyRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#e5e7eb",
    minHeight: 22,
  },
  th: {
    paddingHorizontal: 3,
    paddingVertical: 5,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 8.5,
  },
  thLast: {
    paddingHorizontal: 3,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 8.5,
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
  cName: { width: "42%" },
  cUnits: { width: "10%", alignItems: "center" },
  cCases: { width: "10%", alignItems: "center" },
  cQty: { width: "12%", alignItems: "flex-end" },
  cNote: { width: "20%" },
  productName: { fontSize: 9 },
  productSub: { fontSize: 7.5, color: "#374151" },
  footerBox: {
    marginTop: 10,
    borderWidth: 0.6,
    borderColor: "#000",
  },
  footerRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 16,
  },
  footerLabel: {
    width: 90,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRightWidth: 0.4,
    borderColor: "#9ca3af",
    justifyContent: "center",
    fontSize: 8,
  },
  footerValue: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: "center",
    fontSize: 8,
  },
  replyBox: {
    marginTop: 8,
    borderWidth: 0.6,
    borderColor: "#000",
    padding: 8,
  },
  replyIntro: { fontSize: 8.5, marginBottom: 3 },
  replyFields: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    fontSize: 12,
  },
});

const EMPTY_ROW_COUNT = 12;

export function PurchaseOrderPdf({ data }: { data: PurchaseOrderDocumentData }) {
  const emptyRows = Math.max(0, EMPTY_ROW_COUNT - data.lines.length);

  return (
    <Document>
      <Page size="A4" style={docStyles.page}>
        <View style={docStyles.titleBox}>
          <Text style={docStyles.title}>発　注　書</Text>
        </View>

        <View style={s.headerRow}>
          <View style={s.leftCol}>
            <Text style={s.supplierName}>{data.supplier.name}</Text>
            {data.supplier.postalCode ? (
              <Text style={s.smallLine}>〒{data.supplier.postalCode}</Text>
            ) : null}
            {data.supplier.address ? (
              <Text style={s.smallLine}>{data.supplier.address}</Text>
            ) : null}
            {data.supplier.phone ? (
              <Text style={s.smallLine}>TEL: {data.supplier.phone}</Text>
            ) : null}
            {data.expectedDeliveryDate ? (
              <Text style={s.deadlineEmphasis}>
                ※納期: {formatDateJP(data.expectedDeliveryDate)}
              </Text>
            ) : null}
          </View>

          <View style={s.rightCol}>
            <Text style={s.voucherMeta}>伝票番号: {data.purchaseOrderNo}</Text>
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
              <Text>商品名／JANコード</Text>
            </View>
            <View style={[s.th, s.cUnits]}>
              <Text>入数</Text>
            </View>
            <View style={[s.th, s.cCases]}>
              <Text>ケース</Text>
            </View>
            <View style={[s.th, s.cQty]}>
              <Text>発注数量</Text>
            </View>
            <View style={[s.thLast, s.cNote]}>
              <Text>備考</Text>
            </View>
          </View>

          {data.lines.map((line) => (
            <View key={line.lineNo} style={s.tdRow}>
              <View style={[s.td, s.cNo]}>
                <Text>{String(line.lineNo).padStart(3, "0")}</Text>
              </View>
              <View style={[s.td, s.cName]}>
                <Text style={s.productName}>{line.productName}</Text>
                {line.janCode ? (
                  <Text style={s.productSub}>{line.janCode}</Text>
                ) : null}
              </View>
              <View style={[s.td, s.cUnits]}>
                <Text>{line.unitsPerCase}</Text>
              </View>
              <View style={[s.td, s.cCases]}>
                <Text>{line.caseCount > 0 ? line.caseCount : "-"}</Text>
              </View>
              <View style={[s.td, s.cQty]}>
                <Text>{formatCurrency(line.quantity)}</Text>
              </View>
              <View style={[s.tdLast, s.cNote]}>
                <Text style={s.productSub}>{line.note ?? ""}</Text>
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
              <View style={[s.td, s.cCases]}>
                <Text> </Text>
              </View>
              <View style={[s.td, s.cQty]}>
                <Text> </Text>
              </View>
              <View style={[s.tdLast, s.cNote]}>
                <Text> </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.footerBox}>
          <View style={s.footerRow}>
            <View style={s.footerLabel}>
              <Text>送り先</Text>
            </View>
            <View style={s.footerValue}>
              <Text>
                {data.supplier.name}
                {data.supplier.address ? `（${data.supplier.address}）` : ""}
              </Text>
            </View>
          </View>
          <View style={s.footerRow}>
            <View style={s.footerLabel}>
              <Text>送り主</Text>
            </View>
            <View style={s.footerValue}>
              <Text>
                {data.company.companyName} 〒{data.company.postalCode}{" "}
                {data.company.address} TEL: {data.company.tel}
              </Text>
            </View>
          </View>
          {data.note ? (
            <View style={s.footerRow}>
              <View style={s.footerLabel}>
                <Text>備考</Text>
              </View>
              <View style={s.footerValue}>
                <Text>{data.note}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={s.replyBox}>
          <Text style={s.replyIntro}>いつもお世話になっております。</Text>
          <Text style={s.replyIntro}>
            必ず出荷日・納品日のご返信をお願いいたします。
          </Text>
          <View style={s.replyFields}>
            <Text>　　月　　　日 出荷　</Text>
            <Text>　　月　　　日 着　</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
