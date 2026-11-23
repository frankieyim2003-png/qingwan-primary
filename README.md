GitHub Pages：https://frankieyim2003-png.github.io/qingwan-primary/

# 圓形小學

一個給小朋友同家長試玩嘅校園散步原型。你可以喺虛構嘅**圓形小學**自由行走，再完成三個短任務。

呢間學校、校服、老師同同學都係虛構，唔係任何真實學校。

## 點玩

用瀏覽器打開 `index.html` 就得。手機同電腦都可以。

- **行**：畫面左半邊撳住拖（搖桿），或者鍵盤 `WASD`／方向鍵
- **衝**：按住右邊「衝」，或者 `Shift`
- **互動**：行近任務板或者人，撳「互動」或者 `E`。亦可以輕觸面前嘅人
- **小地圖**：右上角。黃點係你，紅點係目標
- 白點係任務路線。畫面邊緣嘅紅色箭嘴會指向目標

建議用區域網絡或者本機伺服器打開，避免手機檔案限制：

```bash
python3 -m http.server 8747
```

然後開 [http://127.0.0.1:8747](http://127.0.0.1:8747)。

## 三個任務

任務板喺校門。

1. **準時返班**：70 秒內返到四年級甲班
2. **交功課簿**：去小花園攞功課簿，交俾圖書館黃老師
3. **靜靜上天台**：等陳老師行開，避開黃色視線，上到天台觀景位

任務可以重玩。完成紀錄會留喺呢部裝置（`localStorage`），唔使登入。

陳老師巡邏只係等佢行開再走過，唔會追住你。

## 地圖

操場、禮堂、課室大樓、飯堂、圖書館、天台，同兩個隱藏位：秘密小樹林、隱藏角落。

校園南面仲有兩個可以隨時玩、唔影響三個任務嘅地方：

- **游泳池**：25 米自由泳校隊選拔。左右揀泳線，一下一下撳「衝」划水。節奏穩先至快，撳太密會攰。第一或者第二名就加入游泳校隊。
- **有蓋操場**：30 秒射籃。搖桿或者 WASD 瞄準，撳「互動」或者 E 射出（手機可以放開搖桿）。遠籃分數更高，連續入波有連擊。最高分會留低。

紀錄同任務一樣，留喺呢部裝置（`qingwan-primary-v1`）。

## 試玩畫面

`screenshots/` 有手機同電腦畫面：校門、橫向手機，同完成三個任務。

## 放到 GitHub Pages

呢個係靜態網頁，唔使 build。把整個資料夾放到 Pages，根目錄要有 `index.html` 同 `.nojekyll`（已經有）。

## 字型

`fonts/QingWan.woff2` 係 **jf open 粉圓** 嘅子集，已改名，避免使用保留字型名稱。授權係 SIL Open Font License 1.1，全文喺 `fonts/OFL.txt`。漢字來源包括 Kosugi Maru（Apache-2.0）。

## English

圓形小學 is a small, kid-friendly campus toy: walk around, then finish three short errands. It is a fictional school. Open `index.html` in a browser, or serve the folder with any static server. Phone: drag the left side to walk, hold 衝 to sprint, tap 互動 beside a person or the quest board. Desktop: WASD or arrow keys, Shift to sprint, E to talk. South of the playground there is a pool (swim-team tryout) and a covered court (30-second shooting). Both are optional and do not change the three errands.
