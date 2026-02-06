---
# ===========================================
# 規格外品テンプレート
# このフォルダをコピーして新商品を追加してください
# ===========================================
# 使用方法:
# 1. このフォルダ(_template)を同じディレクトリ内にコピー
# 2. フォルダ名を「連番_年-シーズン-花の種類」に変更
#    例: 01_2026-winter-stock, 02_2026-summer-lisianthus
# 3. 下記の項目を編集
# 4. main.jpg, gallery/01.jpg等の画像を差し替え
# 5. 販売終了時は saleStatus を 'discontinued' に変更
# ===========================================

name: "【ここに商品名を入力】（規格外品）"
description: "【ここに商品説明を入力】"
flowerType: "【花の種類を入力 例: トルコギキョウ、ストック】"

category: "imperfect"
availableSeason: "【販売時期 例: 2026年冬】"
saleStatus: "available"  # available / out_of_stock / seasonal / discontinued

# メイン画像（必須）- このフォルダ内のmain.jpgに差し替え
image: "/images/products/placeholder.jpg"

# ギャラリー画像（任意）
gallery:
  - "/images/products/placeholder-gallery-1.jpg"
  - "/images/products/placeholder-gallery-2.jpg"

# 価格テーブル（規格外品は花ごとに異なるため必須）
priceTable:
  - size: "小箱(80サイズ)"
    stemLength: "約30cm"
    quantity: "約30本"
    price: 2200
    note: ""
  - size: "中箱(100サイズ)"
    stemLength: "約40cm"
    quantity: "約50本"
    price: 3500
    note: "単価10%お得"
  - size: "大箱(120サイズ)"
    stemLength: "約50cm"
    quantity: "約80本"
    price: 5000
    note: "単価18%お得"

# 花の特徴
features:
  - "【特徴1を入力】"
  - "【特徴2を入力】"

# 規格外となる理由
imperfectReasons:
  - "【規格外理由1を入力 例: 茎の長さが規格に満たない】"
  - "【規格外理由2を入力 例: 形状の個体差】"

# 旬の季節
season:
  - "winter"  # spring / summer / autumn / winter

# タグ
tags:
  - "規格外品"
  - "【追加タグ】"

order: 1  # 表示順（連番）
---

【ここに商品の詳細説明を入力】

市場規格には合わないものの、品質・美しさは一般の花と変わりません。

**こんな方におすすめ**
- 【ターゲット1】
- 【ターゲット2】

**ご注意**
規格外品のため、サイズや形状にばらつきがあります。
