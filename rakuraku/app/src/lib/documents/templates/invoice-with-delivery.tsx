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
  pageContainer: {
    flexDirection: "column",
    width: "100%",
    height: "100%",
  },
  half: {
    flexGrow: 1,
    paddingBottom: 6,
  },
  divider: {
    borderTopWidth: 0.5,
    borderColor: "#9ca3af",
    borderStyle: "dashed",
    marginVertical: 6,
  },
  titleBoxSmall: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 0.8,
    borderColor: "#000",
    marginBottom: 6,
  },
  titleSmall: {
    fontFamily: FONT_GOTHIC,
    fontSize: 14,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  leftCol: { width: "55%" },
  rightCol: { width: "42%", alignItems: "flex-end" },
  customerName: {
    fontFamily: FONT_GOTHIC,
    fontSize: 12,
    marginBottom: 2,
  },
  postalLine: { fontSize: 7.5 },
  addressLine: { fontSize: 7.5, marginBottom: 3 },
  customerCode: { fontSize: 7.5, marginBottom: 4 },
  intro: { fontSize: 7.5 },
  closingLine: { fontSize: 8, marginBottom: 1 },
  voucherNo: { fontSize: 8, marginBottom: 1 },

  summaryBand: {
    borderWidth: 0.5,
    borderColor: "#000",
    marginTop: 4,
    marginBottom: 4,
  },
  summaryHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
  },
  summaryCol: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 6.5,
  },
  summaryColLast: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 6.5,
  },
  summaryCellRow: {
    flexDirection: "row",
    minHeight: 18,
  },
  summaryValueCol: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "flex-end",
    fontSize: 7.5,
  },
  summaryValueColLast: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "flex-end",
    fontSize: 9,
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

  detailTable: {
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "#000",
  },
  detailThRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
  },
  detailTdRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 18,
  },
  detailEmptyRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#e5e7eb",
    minHeight: 14,
  },
  th: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 7.5,
  },
  thLast: {
    paddingHorizontal: 2,
    paddingVertical: 3,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 7.5,
  },
  td: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRightWidth: 0.4,
    borderColor: "#9ca3af",
    justifyContent: "center",
  },
  tdLast: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    justifyContent: "center",
  },
  cDate: { width: "11%", alignItems: "center" },
  cInvNo: { width: "12%", alignItems: "center" },
  cItem: { width: "44%" },
  cQty: { width: "10%", alignItems: "flex-end" },
  cPrice: { width: "10%", alignItems: "flex-end" },
  cAmount: { width: "13%", alignItems: "flex-end" },
  itemLine: { fontSize: 7.5 },
  itemNote: { fontSize: 7, color: "#374151" },
});

const EMPTY_DETAIL_ROW_COUNT = 7;

function InvoiceBlock({
  data,
  title,
  intro,
  showBankInfo,
}: {
  data: InvoiceDocumentData;
  title: string;
  intro: string;
  showBankInfo: boolean;
}) {
  const breakdown10 = data.taxBreakdown.find(
    (b) => Math.abs(b.taxRate - 0.1) < 1e-9
  );
  const breakdown8 = data.taxBreakdown.find(
    (b) => Math.abs(b.taxRate - 0.08) < 1e-9
  );

  const emptyRows = Math.max(
    0,
    EMPTY_DETAIL_ROW_COUNT - data.detailLines.length
  );

  return (
    <View style={s.half}>
      <View style={s.titleBoxSmall}>
        <Text style={s.titleSmall}>{title}</Text>
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
          <Text style={s.intro}>{intro}</Text>
        </View>

        <View style={s.rightCol}>
          <Text style={s.closingLine}>
            {formatDateJP(data.periodTo)} 締
          </Text>
          <Text style={s.voucherNo}>伝票番号: {data.statementNo}</Text>
          <View style={{ height: 4 }} />
          <CompanyInfoBlock
            company={data.company}
            showBankInfo={showBankInfo}
          />
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
              <Text style={{ fontSize: 6.5 }}>
                {formatTaxRatePct(breakdown10?.taxRate ?? 0.1)}
              </Text>
              <Text style={{ fontSize: 6.5 }}>
                {formatTaxRatePct(breakdown8?.taxRate ?? 0.08)}
              </Text>
            </View>
          </View>
          <View style={[s.summaryValueCol, s.cSubtotal]}>
            <View>
              <Text style={{ fontSize: 6.5 }}>
                {formatCurrency(breakdown10?.subtotal ?? 0)}
              </Text>
              <Text style={{ fontSize: 6.5 }}>
                {formatCurrency(breakdown8?.subtotal ?? 0)}
              </Text>
            </View>
          </View>
          <View style={[s.summaryValueCol, s.cTax]}>
            <View>
              <Text style={{ fontSize: 6.5 }}>
                {formatCurrency(breakdown10?.taxAmount ?? 0)}
              </Text>
              <Text style={{ fontSize: 6.5 }}>
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
            <Text>金額</Text>
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
    </View>
  );
}

export function InvoiceWithDeliveryPdf({
  data,
}: {
  data: InvoiceDocumentData;
}) {
  return (
    <Document>
      <Page size="A4" style={docStyles.page}>
        <View style={s.pageContainer}>
          <InvoiceBlock
            data={data}
            title="請　求　書"
            intro="毎度ありがとうございます。下記の通りご請求申し上げます。"
            showBankInfo
          />
          <View style={s.divider} />
          <InvoiceBlock
            data={data}
            title="納　品　書"
            intro="毎度ありがとうございます。下記の通り納品致しましたのでご査収下さい。"
            showBankInfo={false}
          />
        </View>
      </Page>
    </Document>
  );
}
