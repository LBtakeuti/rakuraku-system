import { StyleSheet } from "@react-pdf/renderer";

/**
 * 帳票PDFの共通スタイル。
 * フォント: IPAex 系（font-loader.ts で事前登録）。
 * 単位: pt（@react-pdf/renderer の規定）。1mm ≒ 2.835pt。
 */

export const FONT_GOTHIC = "IPAexGothic";
export const FONT_MINCHO = "IPAexMincho";

export const docStyles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily: FONT_GOTHIC,
    fontSize: 9,
    color: "#000",
  },
  pageLandscape: {
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 18,
    fontFamily: FONT_GOTHIC,
    fontSize: 8,
    color: "#000",
  },
  titleBox: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 10,
  },
  title: {
    fontFamily: FONT_MINCHO,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 2,
  },
  rowFlex: {
    flexDirection: "row",
  },
  fillRest: {
    flex: 1,
  },
  textRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
  },
  table: {
    borderWidth: 0.6,
    borderColor: "#000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderColor: "#000",
    backgroundColor: "#f3f4f6",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderColor: "#9ca3af",
    minHeight: 18,
  },
  cell: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRightWidth: 0.4,
    borderColor: "#9ca3af",
    justifyContent: "center",
  },
  headerCell: {
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRightWidth: 0.6,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  cellLast: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: "center",
  },
  small: {
    fontSize: 7.5,
  },
  xs: {
    fontSize: 6.5,
  },
  bold: {
    fontFamily: FONT_GOTHIC,
    fontWeight: "bold",
  },
  emphasis: {
    fontSize: 12,
    fontFamily: FONT_GOTHIC,
    fontWeight: "bold",
  },
  hr: {
    borderBottomWidth: 0.5,
    borderColor: "#000",
    marginVertical: 4,
  },
});
