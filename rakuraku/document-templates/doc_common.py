# -*- coding: utf-8 -*-
"""帳票PDF生成の共通ヘルパー。IPAフォント(TrueType)を埋め込む。"""
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

GOTHIC = "IPAGothic"
GOTHIC_BOLD = "IPAGothic"   # IPAは1ウェイト。太字も同じで代用
MINCHO = "IPAGothic"        # 明朝が無い環境のためゴシックで代用

_registered = False

def register_fonts():
    global _registered
    if _registered:
        return
    pdfmetrics.registerFont(TTFont("IPAGothic", "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"))
    _registered = True

PAGE_W, PAGE_H = A4

def mm(v):
    return v * 2.83465
