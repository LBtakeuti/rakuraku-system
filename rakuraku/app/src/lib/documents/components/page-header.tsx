import { Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CompanySetting } from "@/types/company-setting";
import { FONT_GOTHIC } from "@/lib/documents/styles";

const styles = StyleSheet.create({
  block: {
    alignItems: "flex-end",
    fontFamily: FONT_GOTHIC,
  },
  reg: { fontSize: 7.5, marginBottom: 1 },
  company: { fontSize: 10, marginBottom: 1 },
  addr: { fontSize: 7.5, marginBottom: 1 },
  tel: { fontSize: 7.5, marginBottom: 1 },
  bank: { fontSize: 7.5 },
});

type Props = {
  company: CompanySetting;
  /** 銀行情報を出すかどうか（発注書では非表示が一般的） */
  showBankInfo?: boolean;
  /** 登録番号を出すかどうか */
  showRegistrationNo?: boolean;
};

export function CompanyInfoBlock({
  company,
  showBankInfo = true,
  showRegistrationNo = true,
}: Props) {
  const telLine = company.fax
    ? `TEL:${company.tel}　FAX:${company.fax}`
    : `TEL:${company.tel}`;
  return (
    <View style={styles.block}>
      {showRegistrationNo ? (
        <Text style={styles.reg}>登録番号 {company.registrationNo}</Text>
      ) : null}
      <Text style={styles.company}>{company.companyName}</Text>
      <Text style={styles.addr}>
        〒{company.postalCode} {company.address}
      </Text>
      <Text style={styles.tel}>{telLine}</Text>
      {showBankInfo ? (
        <Text style={styles.bank}>【お振込先】{company.bankInfo}</Text>
      ) : null}
    </View>
  );
}
