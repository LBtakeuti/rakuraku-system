# -*- coding: utf-8 -*-
"""現行システムの帳票5種をPDFで再現する。
発注書 / 受注伝票 / 請求書 / 請求書+納品書 / 請求一覧表
"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from doc_common import register_fonts, GOTHIC, GOTHIC_BOLD, MINCHO, mm, PAGE_W, PAGE_H

register_fonts()

# 自社情報(設定マスター相当)
COMPANY = {
    "name": "株式会社プロスパ",
    "reg_no": "登録番号 T6011801020915",
    "zip": "121-0831",
    "addr": "東京都足立区舎人5-16-10",
    "tel": "TEL:03-5856-8263　FAX:03-5856-8273",
    "bank": "【お振込先】三菱UFJ銀行／千住支店　普通預金 4814091",
}

# ---- 描画ヘルパー ----
def text(c, x, y, s, font=GOTHIC, size=9, align="left"):
    c.setFont(font, size)
    if align == "left":
        c.drawString(x, y, s)
    elif align == "right":
        c.drawRightString(x, y, s)
    elif align == "center":
        c.drawCentredString(x, y, s)

def box(c, x, y, w, h, lw=0.6):
    c.setLineWidth(lw)
    c.rect(x, y, w, h)

def line(c, x1, y1, x2, y2, lw=0.6):
    c.setLineWidth(lw)
    c.line(x1, y1, x2, y2)

def title_box(c, cx, y, label, size=18):
    """中央寄せの囲みタイトル"""
    c.setFont(MINCHO, size)
    w = c.stringWidth(label, MINCHO, size) + mm(10)
    h = mm(9)
    c.setLineWidth(0.8)
    c.rect(cx - w/2, y, w, h)
    c.drawCentredString(cx, y + mm(2.6), label)


# =====================================================================
# 1. 発注書
# =====================================================================
def make_purchase_order(path):
    c = canvas.Canvas(path, pagesize=A4)
    W, H = A4
    top = H - mm(15)

    title_box(c, W/2, top - mm(4), "発　注　書", 18)

    # 右上: 伝票番号など
    text(c, W - mm(15), top, "伝票番号 : 600026741", GOTHIC, 9, "right")
    text(c, W - mm(15), top - mm(4.5), "Page: 1/1", GOTHIC, 8, "right")
    text(c, W - mm(15), top - mm(9), "伝票日付:2026年 3月31日", GOTHIC, 9, "right")

    # 納期(強調)
    text(c, W - mm(15), top - mm(17), "※納期:2026年 4月 3日", GOTHIC_BOLD, 13, "right")
    text(c, W - mm(15), top - mm(24), "AM必着", GOTHIC_BOLD, 13, "right")

    # 左上: 仕入先
    text(c, mm(15), top - mm(4), "北関東営業所", GOTHIC_BOLD, 13)
    text(c, mm(15), top - mm(12), "平塚配送センター　御中", GOTHIC, 8)
    text(c, mm(15), top - mm(16.5), "〒254-0012", GOTHIC, 8)
    text(c, mm(15), top - mm(21), "神奈川県平塚市大神8-5-9-Ⅱ号棟", GOTHIC, 8)
    text(c, mm(15), top - mm(25.5), "TEL:0463-71-6501", GOTHIC, 8)

    # 右: 自社情報
    cy = top - mm(30)
    text(c, W - mm(15), cy, COMPANY["name"], GOTHIC, 9, "right")
    text(c, W - mm(15), cy - mm(4.5), COMPANY["addr"], GOTHIC, 8, "right")
    text(c, W - mm(15), cy - mm(9), COMPANY["tel"], GOTHIC, 8, "right")

    # 明細テーブル
    tx, ty = mm(15), top - mm(42)
    tw = W - mm(30)
    th = mm(150)
    # 列幅
    cols = [mm(12), mm(83), mm(20), mm(20), mm(25), tw - mm(160)]
    headers = ["No.", "商品名／JANコード", "入数", "ケース", "発注数量", "備考"]
    # ヘッダ行
    hh = mm(8)
    box(c, tx, ty - hh, tw, hh)
    cx = tx
    for w, label in zip(cols, headers):
        line(c, cx, ty - hh, cx, ty - th)
        text(c, cx + w/2, ty - mm(5.2), label, GOTHIC, 8.5, "center")
        cx += w
    box(c, tx, ty - th, tw, th)
    line(c, tx, ty - hh, tx + tw, ty - hh)

    # 明細1行
    rowy = ty - hh - mm(11)
    cx = tx
    vals = ["001", None, "48", "100", "4,800", ""]
    for w, v in zip(cols, vals):
        if v is not None:
            text(c, cx + w/2, rowy + mm(2), v, GOTHIC, 9, "center")
        cx += w
    # 商品名は2段
    nx = tx + cols[0] + mm(2)
    text(c, nx, rowy + mm(5), "素肌EVE KISS衣料用クールスプレー100ml", GOTHIC, 9)
    text(c, nx, rowy - mm(0.5), "4589890530713", GOTHIC, 8)
    line(c, tx, ty - hh - mm(16), tx + tw, ty - hh - mm(16))

    # フッタ: 送り先枠
    fy = ty - th - mm(4)
    fh = mm(34)
    box(c, tx, fy - fh, tw, fh)
    rows = [("送り先", "平塚配送センター　㈱アエナ"),
            ("住所", "〒254-0012\n神奈川県平塚市大神8-5-9-Ⅱ号棟"),
            ("電話", "0463-71-6501"),
            ("送り主", "㈱プロスパ"),
            ("送り主電話番号", "")]
    ry = fy
    rh = fh / 5
    labelw = mm(30)
    for label, val in rows:
        line(c, tx, ry, tx + tw, ry)
        line(c, tx + labelw, ry - rh, tx + labelw, ry)
        text(c, tx + mm(2), ry - rh/2 - mm(1), label, GOTHIC, 8)
        if "\n" in val:
            parts = val.split("\n")
            text(c, tx + labelw + mm(3), ry - rh/2 + mm(1.5), parts[0], GOTHIC, 8)
            text(c, tx + labelw + mm(3), ry - rh/2 - mm(2.5), parts[1], GOTHIC, 8)
        else:
            text(c, tx + labelw + mm(3), ry - rh/2 - mm(1), val, GOTHIC, 8)
        ry -= rh

    # 返信欄
    gy = fy - fh - mm(6)
    gh = mm(24)
    box(c, tx, gy - gh, tw, gh)
    text(c, tx + mm(3), gy - mm(6), "いつもお世話になっております。", GOTHIC, 8.5)
    text(c, tx + mm(3), gy - mm(11), "必ず出荷日・納品日のご返信をお願いいたします。", GOTHIC, 8.5)
    line(c, tx, gy - mm(14), tx + tw, gy - mm(14))
    text(c, tx + mm(15), gy - gh + mm(3.5), "月　　　日 出荷", GOTHIC, 12)
    text(c, tx + mm(105), gy - gh + mm(3.5), "月　　　日 着", GOTHIC, 12)

    c.showPage()
    c.save()


# =====================================================================
# 2. 受注伝票
# =====================================================================
def make_sales_order(path):
    c = canvas.Canvas(path, pagesize=A4)
    W, H = A4
    top = H - mm(15)

    title_box(c, W/2, top - mm(4), "受 注 伝 票", 16)

    text(c, W - mm(15), top, "伝票番号 : 600026741", GOTHIC, 9, "right")
    text(c, W - mm(15), top - mm(4.5), "Page: 1/1", GOTHIC, 8, "right")
    text(c, W - mm(15), top - mm(9), "伝票日付 : 2026年 3月31日", GOTHIC, 9, "right")

    # お客様
    text(c, mm(15), top, "000598", GOTHIC, 9)
    text(c, mm(15), top - mm(7), "株式会社アエナ　　　　　　　　様", GOTHIC, 12)
    line(c, mm(15), top - mm(9), mm(110), top - mm(9))

    text(c, mm(15), top - mm(15), "送り先：平塚配送センター　㈱アエナ", GOTHIC, 8)
    text(c, mm(15), top - mm(19), "住所：〒254-0012", GOTHIC, 8)
    text(c, mm(22), top - mm(23), "神奈川県平塚市大神8-5-9-Ⅱ号棟", GOTHIC, 8)
    text(c, mm(15), top - mm(27), "電話：0463-71-6501", GOTHIC, 8)
    text(c, mm(15), top - mm(31), "送り主：㈱プロスパ", GOTHIC, 8)

    # 自社
    cy = top - mm(16)
    text(c, W - mm(15), cy, COMPANY["name"], GOTHIC, 9, "right")
    text(c, W - mm(15), cy - mm(4.5), COMPANY["addr"], GOTHIC, 8, "right")
    text(c, W - mm(15), cy - mm(9), COMPANY["tel"], GOTHIC, 8, "right")

    # 明細テーブル
    tx, ty = mm(15), top - mm(38)
    tw = W - mm(30)
    th = mm(155)
    cols = [mm(10), mm(58), mm(22), mm(22), mm(20), mm(28), tw - mm(160)]
    headers = ["No.", "商品名", "入数\nケース", "発注数量", "単価", "売上金額", "発注番号\n備考"]
    hh = mm(10)
    box(c, tx, ty - th, tw, th)
    box(c, tx, ty - hh, tw, hh)
    cx = tx
    for w, label in zip(cols, headers):
        line(c, cx, ty - th, cx, ty)
        if "\n" in label:
            p = label.split("\n")
            text(c, cx + w/2, ty - mm(4), p[0], GOTHIC, 8, "center")
            text(c, cx + w/2, ty - mm(8), p[1], GOTHIC, 8, "center")
        else:
            text(c, cx + w/2, ty - mm(6.2), label, GOTHIC, 8.5, "center")
        cx += w

    # 明細1行
    rowy = ty - hh - mm(10)
    cx = tx
    # No, 商品名(2段), 入数/ケース(2段), 発注数量, 単価, 売上金額, 発注番号
    text(c, tx + cols[0]/2, rowy + mm(1), "001", GOTHIC, 9, "center")
    nx = tx + cols[0] + mm(1)
    text(c, nx, rowy + mm(4), "25253071　　4589890530713", GOTHIC, 8)
    text(c, nx, rowy - mm(1), "素肌EVE KISS衣料用クールスプレー100ml", GOTHIC, 8.5)
    cx = tx + cols[0] + cols[1]
    text(c, cx + cols[2]/2, rowy + mm(4), "48", GOTHIC, 9, "center")
    text(c, cx + cols[2]/2, rowy - mm(1), "100", GOTHIC, 9, "center")
    cx += cols[2]
    text(c, cx + cols[3] - mm(3), rowy + mm(1), "4,800", GOTHIC, 9, "right")
    cx += cols[3]
    text(c, cx + cols[4] - mm(3), rowy + mm(1), "100", GOTHIC, 9, "right")
    cx += cols[4]
    text(c, cx + cols[5] - mm(3), rowy + mm(1), "480,000", GOTHIC, 9, "right")
    cx += cols[5]
    text(c, cx + cols[6]/2, rowy + mm(1), "600026695", GOTHIC, 8, "center")
    line(c, tx, ty - hh - mm(15), tx + tw, ty - hh - mm(15))

    # 合計欄(右下)
    sx = tx + tw - mm(85)
    sy = ty - th - mm(6)
    rows = [("合計：", "480,000"), ("消費税額", "48,000"), ("総合計：", "528,000")]
    for i, (label, val) in enumerate(rows):
        yy = sy - i * mm(7)
        box(c, sx, yy - mm(6), mm(45), mm(7))
        box(c, sx + mm(45), yy - mm(6), mm(40), mm(7))
        text(c, sx + mm(3), yy - mm(4.3), label, GOTHIC, 9)
        text(c, sx + mm(83), yy - mm(4.3), val, GOTHIC, 9, "right")

    text(c, tx, sy - mm(30), "摘要：", GOTHIC, 9)
    line(c, tx + mm(12), sy - mm(31), tx + mm(90), sy - mm(31))

    c.showPage()
    c.save()


# =====================================================================
# 3. 請求書(単体)
# =====================================================================
def draw_invoice_block(c, ox, oy, W, doc_title, intro):
    """請求書/納品書の1ブロックを描く。ox,oy は左上基準。"""
    tx = ox + mm(15)
    tw = W - mm(30)

    title_box(c, ox + W/2, oy - mm(8), doc_title, 16)
    text(c, ox + W - mm(15), oy - mm(4), "Page. 1/ 1", GOTHIC, 8, "right")

    # お客様
    text(c, tx, oy - mm(5), "272-0122", GOTHIC, 8)
    text(c, tx, oy - mm(9), "千葉県市川市宝1-3-9", GOTHIC, 8)
    text(c, tx, oy - mm(16), "株式会社ミツミネ　様", GOTHIC, 12)
    text(c, tx, oy - mm(22), "お客様コードNo.000072", GOTHIC, 8)
    text(c, tx, oy - mm(27), intro, GOTHIC, 8)

    # 自社(右ブロック。タイトルの下から開始)
    cy = oy - mm(15)
    text(c, ox + W - mm(15), cy, "2026年 3月31日 締", GOTHIC, 9, "right")
    text(c, ox + W - mm(15), cy - mm(5), "お支払期限:2026年 4月30日", GOTHIC, 9, "right")
    text(c, ox + W - mm(15), cy - mm(11), COMPANY["reg_no"], GOTHIC, 7.5, "right")
    text(c, ox + W - mm(15), cy - mm(15.5), COMPANY["name"], GOTHIC, 9, "right")
    text(c, ox + W - mm(15), cy - mm(20), COMPANY["zip"] + " " + COMPANY["addr"], GOTHIC, 7.5, "right")
    text(c, ox + W - mm(15), cy - mm(24), COMPANY["tel"], GOTHIC, 7.5, "right")
    text(c, ox + W - mm(15), cy - mm(28), COMPANY["bank"], GOTHIC, 7.5, "right")

    # 集計帯(自社情報ブロックの下に配置)
    band_y = oy - mm(48)
    bh = mm(13)
    labels = ["前回御請求額", "御入金額", "繰越金額", "税率", "御買上額", "消費税額", "御買上計", "今回御請求額"]
    widths = [mm(22), mm(20), mm(20), mm(14), mm(24), mm(22), mm(22), tw - mm(144)]
    box(c, tx, band_y - bh, tw, bh)
    cx = tx
    for label, w in zip(labels, widths):
        line(c, cx, band_y - bh, cx, band_y)
        text(c, cx + w/2, band_y - mm(4), label, GOTHIC, 7, "center")
        cx += w
    line(c, tx, band_y - mm(6), tx + tw, band_y - mm(6))
    # 値(10%/8%の2段)
    vals_top = ["0", "0", "0", "10%", "11,520", "1,152", "12,672", "￥12,672"]
    vals_bot = ["", "", "", "8%", "0", "0", "", ""]
    cx = tx
    for w, vt, vb in zip(widths, vals_top, vals_bot):
        text(c, cx + w - mm(2), band_y - mm(10.5), vt, GOTHIC, 7.5, "right")
        if vb:
            text(c, cx + w - mm(2), band_y - mm(4.3), vb, GOTHIC, 7, "right")
        cx += w

    # 明細テーブル
    mt_y = band_y - bh - mm(3)
    mt_h = mm(110)
    cols = [mm(22), mm(26), tw - mm(140), mm(22), mm(22), mm(28)]
    headers = ["伝票日付", "伝票No.", "品番・品名", "数量", "単価", "御買上額"]
    hh = mm(7)
    box(c, tx, mt_y - mt_h, tw, mt_h)
    box(c, tx, mt_y - hh, tw, hh)
    cx = tx
    for w, label in zip(cols, headers):
        line(c, cx, mt_y - mt_h, cx, mt_y)
        text(c, cx + w/2, mt_y - mm(4.8), label, GOTHIC, 8, "center")
        cx += w
    # 明細1行
    rowy = mt_y - hh - mm(8)
    cx = tx
    text(c, cx + cols[0]/2, rowy + mm(3), "2026/03/05", GOTHIC, 8, "center")
    cx += cols[0]
    text(c, cx + cols[1]/2, rowy + mm(3), "100032962", GOTHIC, 8, "center")
    cx += cols[1]
    text(c, cx + mm(2), rowy + mm(3.5), "3層マスク キッズサイズ 50枚", GOTHIC, 8.5)
    text(c, cx + mm(2), rowy - mm(1), "セイセイ薬品様納品分", GOTHIC, 7.5)
    cx += cols[2]
    text(c, cx + cols[3] - mm(3), rowy + mm(3), "72", GOTHIC, 8.5, "right")
    cx += cols[3]
    text(c, cx + cols[4] - mm(3), rowy + mm(3), "160", GOTHIC, 8.5, "right")
    cx += cols[4]
    text(c, cx + cols[5] - mm(3), rowy + mm(3), "11,520", GOTHIC, 8.5, "right")
    line(c, tx, mt_y - hh - mm(13), tx + tw, mt_y - hh - mm(13))


def make_invoice(path):
    c = canvas.Canvas(path, pagesize=A4)
    W, H = A4
    draw_invoice_block(c, 0, H - mm(12), W, "請　求　書",
                       "毎度ありがとうございます。下記の通りご請求申し上げます。")
    text(c, mm(15), mm(15), "インボイス制度開始に伴い各種手数料は貴社ご負担にてお願い致します。", GOTHIC, 7)
    c.showPage()
    c.save()


# =====================================================================
# 4. 請求書 + 納品書(1枚2段組)
# =====================================================================
def draw_combo_block(c, ox, oy, W, doc_title, intro):
    """請求書+納品書用の1ブロック(明細に入数・箱数・※・備考列がある版)"""
    tx = ox + mm(15)
    tw = W - mm(30)

    title_box(c, ox + W/2, oy - mm(7), doc_title, 15)
    text(c, ox + W/2, oy - mm(13), "2026年 3月31日", GOTHIC, 9, "center")

    # お客様
    text(c, tx, oy - mm(5), "440-0084", GOTHIC, 7.5)
    text(c, tx, oy - mm(9), "愛知県豊橋市下地字瀬上53-1", GOTHIC, 7.5)
    text(c, tx, oy - mm(16), "株式会社ジェイアンドシー　様", GOTHIC, 11)
    text(c, tx, oy - mm(22), "お客様コードNo.000391", GOTHIC, 7.5)
    text(c, tx, oy - mm(26), intro, GOTHIC, 7.5)

    # 自社(右ブロック)
    cy = oy - mm(4)
    text(c, ox + W - mm(15), cy, COMPANY["reg_no"], GOTHIC, 7, "right")
    text(c, ox + W - mm(15), cy - mm(4), COMPANY["name"], GOTHIC, 9, "right")
    text(c, ox + W - mm(15), cy - mm(8), COMPANY["zip"] + " " + COMPANY["addr"], GOTHIC, 7, "right")
    text(c, ox + W - mm(15), cy - mm(12), COMPANY["tel"], GOTHIC, 7, "right")
    text(c, ox + W - mm(15), cy - mm(16), COMPANY["bank"], GOTHIC, 7, "right")

    # 伝票番号枠 + 検印枠(自社情報の下、明細の上に横並び)
    bx = ox + W - mm(85)
    by = oy - mm(22)
    box(c, bx, by - mm(9), mm(35), mm(9))
    line(c, bx + mm(24), by - mm(9), bx + mm(24), by)
    text(c, bx + mm(12), by - mm(3.5), "伝票番号", GOTHIC, 6.5, "center")
    text(c, bx + mm(29.5), by - mm(3.5), "Page", GOTHIC, 6.5, "center")
    text(c, bx + mm(12), by - mm(7.5), "100033114", GOTHIC, 7.5, "center")
    text(c, bx + mm(29.5), by - mm(7.5), "1/1", GOTHIC, 7.5, "center")
    # 検印枠
    kx = ox + W - mm(45)
    box(c, kx, by - mm(9), mm(30), mm(9))
    line(c, kx + mm(10), by - mm(9), kx + mm(10), by)
    line(c, kx + mm(20), by - mm(9), kx + mm(20), by)
    text(c, kx + mm(5), by - mm(5.5), "検印", GOTHIC, 6.5, "center")

    # 明細テーブル
    mt_y = oy - mm(36)
    mt_h = mm(56)
    cols = [tw - mm(120), mm(28), mm(24), mm(28), mm(12), mm(28)]
    headers = ["品番・品名", "数量", "単価", "金額", "※", "備考"]
    hh = mm(7)
    box(c, tx, mt_y - mt_h, tw, mt_h)
    box(c, tx, mt_y - hh, tw, hh)
    cx = tx
    for w, label in zip(cols, headers):
        line(c, cx, mt_y - mt_h, cx, mt_y)
        text(c, cx + w/2, mt_y - mm(4.8), label, GOTHIC, 8, "center")
        cx += w

    # 明細2行
    items = [
        ("4901331007439", "貝印 ビューティーM デラックス", "200", "1", "200", "182", "36,400"),
        ("4901331017810", "貝印 キャンバブルL", "200", "3", "600", "110", "66,000"),
    ]
    rowy = mt_y - hh - mm(7)
    for jan, name, irsu, hako, qty, price, amount in items:
        text(c, tx + mm(2), rowy + mm(3), jan, GOTHIC, 7.5)
        text(c, tx + mm(2), rowy - mm(1), name, GOTHIC, 8.5)
        text(c, tx + cols[0] - mm(20), rowy + mm(3.5), "入数 " + irsu, GOTHIC, 6.5)
        cx = tx + cols[0]
        text(c, cx + cols[1] - mm(3), rowy + mm(3.5), "箱数 " + hako, GOTHIC, 6.5, "right")
        text(c, cx + cols[1] - mm(3), rowy - mm(1), qty, GOTHIC, 9, "right")
        cx += cols[1]
        text(c, cx + cols[2] - mm(3), rowy + mm(1), price, GOTHIC, 8.5, "right")
        cx += cols[2]
        text(c, cx + cols[3] - mm(3), rowy + mm(1), amount, GOTHIC, 8.5, "right")
        rowy -= mm(11)
        line(c, tx, rowy + mm(4), tx + tw, rowy + mm(4))

    # 備考(明細欄内)
    text(c, tx + mm(2), mt_y - mt_h + mm(20), "3/16納品  NO. 26SV8038EX-009", GOTHIC, 7.5)
    text(c, tx + mm(2), mt_y - mt_h + mm(13), "濃飛倉庫運輸㈱", GOTHIC, 7.5)
    text(c, tx + mm(2), mt_y - mt_h + mm(6), "弥富ロジスティクスセンター営業所様入れ", GOTHIC, 7.5)

    # 集計欄
    sy = mt_y - mt_h
    sh = mm(14)
    box(c, tx, sy - sh, tw, sh)
    line(c, tx, sy - sh/2, tx + tw, sy - sh/2)
    # 摘要
    text(c, tx + mm(2), sy - mm(7), "摘要：", GOTHIC, 8)
    sx = tx + mm(38)
    line(c, sx, sy - sh, sx, sy)
    # 10%/8% 行
    for i, rate in enumerate(["10%", "8%"]):
        yy = sy - i * sh/2
        text(c, sx + mm(2), yy - mm(4.5), rate + " 税抜合計", GOTHIC, 7.5)
        text(c, sx + mm(58), yy - mm(4.5), "102,400" if i == 0 else "", GOTHIC, 8, "right")
        text(c, sx + mm(62), yy - mm(4.5), "消費税額", GOTHIC, 7.5)
        text(c, sx + mm(110), yy - mm(4.5), "10,240" if i == 0 else "", GOTHIC, 8, "right")
    line(c, sx + mm(64), sy - sh, sx + mm(64), sy)
    line(c, sx + mm(114), sy - sh, sx + mm(114), sy)
    text(c, sx + mm(118), sy - mm(5), "総合計金額", GOTHIC, 8)
    text(c, tx + tw - mm(3), sy - mm(11), "￥112,640", GOTHIC, 11, "right")


def make_invoice_delivery(path):
    c = canvas.Canvas(path, pagesize=A4)
    W, H = A4
    # 上段: 請求書
    draw_combo_block(c, 0, H - mm(10), W, "請　求　書",
                     "毎度ありがとうございます。下記の通りご請求申し上げます。")
    # 中央の切り取り線
    cut_y = H/2
    c.setDash(3, 2)
    line(c, mm(5), cut_y, W - mm(5), cut_y, 0.4)
    c.setDash()
    # 下段: 納品書
    draw_combo_block(c, 0, H/2 - mm(8), W, "納　品　書",
                     "毎度ありがとうございます。下記の通り納品致しましたのでご査収下さい。")
    c.showPage()
    c.save()


# =====================================================================
# 5. 請求一覧表(横向き)
# =====================================================================
def make_billing_list(path):
    c = canvas.Canvas(path, pagesize=landscape(A4))
    W, H = landscape(A4)
    top = H - mm(14)

    text(c, mm(14), top, "株式会社プロスパ", GOTHIC, 9)
    text(c, W/2, top, "請　求　一　覧　表　（請求済）", MINCHO, 14, "center")
    text(c, W - mm(14), top, "作成年月日 : 2026年 4月 1日", GOTHIC, 8, "right")
    text(c, W - mm(14), top - mm(4.5), "ページ：1", GOTHIC, 8, "right")
    text(c, mm(14), top - mm(6), "2026年 3月20日 締", GOTHIC, 9)

    # テーブル
    tx, ty = mm(8), top - mm(12)
    tw = W - mm(16)
    headers = ["得意先\nコード", "得意先名", "区分", "売上\n伝票数", "回収予定日",
               "前回請求", "入金", "入金時\n手数料", "繰越", "返品\n値引",
               "売上", "請求\n値引", "消費税", "御買上金額", "今回請求"]
    # 比率で配分(合計が tw になるよう正規化)
    ratios = [1.6, 5.0, 1.0, 1.1, 1.9,
              2.0, 2.0, 1.3, 1.9, 1.5,
              2.0, 1.3, 1.7, 2.0, 2.0]
    total_r = sum(ratios)
    widths = [tw * r / total_r for r in ratios]

    hh = mm(9)
    box(c, tx, ty - hh, tw, hh)
    cx = tx
    for w, label in zip(widths, headers):
        line(c, cx, ty - hh, cx, ty)
        if "\n" in label:
            p = label.split("\n")
            text(c, cx + w/2, ty - mm(3.8), p[0], GOTHIC, 6.3, "center")
            text(c, cx + w/2, ty - mm(7), p[1], GOTHIC, 6.3, "center")
        else:
            text(c, cx + w/2, ty - mm(5.5), label, GOTHIC, 6.8, "center")
        cx += w

    # データ行
    rows = [
        ("000113", "株式会社えびすや商店 本社", "外税", "1", "2026-4-20",
         "60,522", "0", "0", "60,522", "0", "23,940", "0", "2,394", "26,334", "86,856"),
        ("000141", "株式会社えびすや商店 ABS御光センター", "外税", "2", "2026-4-20",
         "6,864", "0", "0", "6,864", "0", "19,440", "0", "1,944", "21,384", "28,248"),
        ("000143", "有限会社えびすや商店 ABS御光センター", "外税", "0", "2026-4-20",
         "79,002", "0", "0", "79,002", "0", "0", "0", "0", "0", "79,002"),
        ("000146", "株式会社えびすや商店", "外税", "1", "2026-4-20",
         "24,816", "0", "0", "24,816", "0", "27,300", "0", "2,730", "30,030", "54,846"),
        ("000203", "株式会社えびすや商店 ABS御光センター", "外税", "12", "2026-4-20",
         "2,564,004", "1,662,854", "2,546", "898,604", "0", "1,827,200", "0", "182,720", "2,009,920", "2,908,524"),
        ("000218", "株式会社タカハシ", "外税", "13", "2026-4-30",
         "0", "0", "0", "0", "0", "25,200", "0", "2,520", "27,720", "27,720"),
        ("000219", "株式会社ジェーソン", "外税", "1", "2026-4-20",
         "2,800,784", "2,603,226", "197,558", "0", "0", "29,160", "0", "2,916", "32,076", "32,076"),
        ("000657", "丸太商株式会社", "外税", "1", "2026-4-20",
         "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"),
        ("000668", "株式会社水高", "外税", "3", "2026-4-10",
         "35,607", "35,607", "0", "0", "0", "242,334", "0", "24,233", "266,567", "266,567"),
        ("000675", "株式会社 はんない(改井店)", "外税", "2", "2026-4-10",
         "0", "0", "0", "0", "0", "22,200", "0", "1,776", "23,976", "23,976"),
    ]
    rh = mm(7.5)
    ry = ty - hh
    for row in rows:
        line(c, tx, ry, tx + tw, ry)
        cx = tx
        for i, (w, val) in enumerate(zip(widths, row)):
            if i == 1:  # 得意先名は左寄せ
                text(c, cx + mm(1.2), ry - mm(5), val, GOTHIC, 6.3)
            elif i in (0, 2, 3, 4):  # コード・区分・枚数・日付は中央
                text(c, cx + w/2, ry - mm(5), val, GOTHIC, 6.5, "center")
            else:  # 金額は右寄せ
                text(c, cx + w - mm(1.2), ry - mm(5), val, GOTHIC, 6.5, "right")
            cx += w
        ry -= rh
    box(c, tx, ry, tw, ty - hh - ry)
    cx = tx
    for w in widths:
        line(c, cx, ry, cx, ty - hh)
        cx += w

    # 総合計行
    line(c, tx, ry, tx + tw, ry, 1.0)
    text(c, tx + widths[0] + mm(1.2), ry - mm(5), "総合計", GOTHIC, 6.8)
    text(c, tx + widths[0] + widths[1] + widths[2]/2, ry - mm(5), "30", GOTHIC, 6.5, "center")
    box(c, tx, ry - rh, tw, rh)
    # 合計値(主要列のみ)
    totals = {5: "5,652,699", 6: "4,382,787", 8: "1,069,808", 10: "2,216,774",
              12: "221,233", 13: "2,438,007", 14: "3,507,815"}
    cx = tx
    for i, w in enumerate(widths):
        if i in totals:
            text(c, cx + w - mm(1.2), ry - mm(5), totals[i], GOTHIC, 6.5, "right")
        line(c, cx, ry - rh, cx, ry)
        cx += w

    c.showPage()
    c.save()


# ---- 実行 ----
if __name__ == "__main__":
    import os
    out = "/home/claude/pdfs"
    os.makedirs(out, exist_ok=True)
    make_purchase_order(f"{out}/01_発注書.pdf")
    make_sales_order(f"{out}/02_受注伝票.pdf")
    make_invoice(f"{out}/03_請求書.pdf")
    make_invoice_delivery(f"{out}/04_請求書納品書.pdf")
    make_billing_list(f"{out}/05_請求一覧表.pdf")
    print("done:", os.listdir(out))
