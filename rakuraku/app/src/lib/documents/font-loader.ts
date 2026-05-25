import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * 帳票PDFで使用する日本語フォント（IPAex ゴシック・IPAex 明朝）を登録する。
 * Route Handler の最初に1回呼び出す。複数呼び出しても登録は1回だけ。
 *
 * @react-pdf/renderer の Font.register は src に file:// URL または絶対パス
 * を受け付ける。app/public/fonts/ 配下に配置された TTF を参照する。
 */
export function ensureFontsRegistered(): void {
  if (registered) return;

  const fontsDir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "IPAexGothic",
    src: path.join(fontsDir, "ipaexg.ttf"),
  });
  Font.register({
    family: "IPAexMincho",
    src: path.join(fontsDir, "ipaexm.ttf"),
  });

  registered = true;
}
