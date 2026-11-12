# TikZ Automaton Editor

LaTeX の TikZ `automata` ライブラリで描くオートマトン（状態遷移図）を、**コンパイル結果と同じ見た目のまま** GUI で編集し、TikZ コードとして出力する Web アプリです。

## 特徴

- **TikZ と同一の見た目で編集** — キャンバスは TikZ / pgf のソースどおりに計算して描画しています。
  - 状態の円の大きさ（`minimum size=2.5em`, `inner sep`、ラベル幅に応じた拡大）
  - `accepting`（`double`）の二重線、`initial` 矢印と `start` テキスト
  - `bend left/right=θ` の曲線（制御点 0.3915×距離）、`loop above/below/left/right`
  - `auto` / `swap` によるラベル位置（8 方向アンカーの選択規則まで再現）
  - `shorten >=1pt` と矢印 `Stealth` / `Latex` / `to` の形状・位置
  - ラベルは KaTeX（Computer Modern）で描画し、TeX と同じ幅・高さ・深さで配置。添字は cmr7/cmmi7 の字幅も再現
- **グリッドスナップの ON/OFF** — ツールバーまたは `G` キーで切り替え。間隔は 0.1 / 0.25 / 0.5 / 1 cm。
  `Alt` を押しながらドラッグすると一時的に反転。OFF のときは 0.01 cm 単位（出力コードと同じ精度）で配置されます。
- 座標は TikZ と同じ cm 単位で保持し、そのまま `\node ... at (x, y)` として出力
- Undo/Redo、コピー＆ペースト、複数選択、ドラッグで曲げ角度・ループ向きを変更
- 自動保存（ブラウザの localStorage）、JSON での保存・読み込み、`.tex` ダウンロード

## 使い方

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ に静的ファイルを出力
```

| 操作 | 内容 |
| --- | --- |
| `V` / `S` / `T` | 選択 / 状態追加 / 遷移追加 ツール |
| 空白をダブルクリック | 状態を追加 |
| 遷移ツールで状態→状態へドラッグ（またはクリック→クリック） | 遷移を追加（同じ状態ならループ） |
| 遷移をドラッグ | 曲げ角度（ループは向き）を変更 |
| `G` / `Shift+G` | スナップ ON/OFF / グリッド表示 |
| `A` / `I` | 受理状態 / 初期状態を切り替え |
| `Ctrl+Z` / `Ctrl+Shift+Z` | 元に戻す / やり直す |
| `Ctrl+ホイール`、`Space+ドラッグ` | ズーム、画面移動 |

ラベルは TeX の数式モードで入力します（例: `q_0`, `a,b`, `\varepsilon`）。

### 出力されるコード

```latex
% \usepackage{tikz}  \usetikzlibrary{automata, arrows.meta}
\begin{tikzpicture}[->, >={Stealth}, shorten >=1pt, auto, semithick]
  \node[state, initial] (q0) at (0, 0) {$q_{0}$};
  \node[state, accepting] (q1) at (3, 0) {$q_{1}$};

  \path (q0) edge [bend left=30] node {$a$} (q1)
        (q1) edge [bend left=30] node {$b$} (q0)
        (q1) edge [loop above] node {$a,b$} ();
\end{tikzpicture}
```

「文書全体」にチェックを入れると `standalone` クラスの完全な文書として出力します（LaTeX 標準の 10pt を前提）。

## 描画の検証

TeX Live（`pdflatex`, `pdftocairo`）があれば、実際の TikZ 出力とキャンバス描画を重ねて比較できます。

```bash
npm run verify   # src/verify/samples.ts の図を pdflatex でコンパイルし verify-out/ に SVG 化
npm run dev      # http://localhost:5173/verify.html?s=stealth&mode=diff
```

`mode=diff` は差分（一致していれば白）、`overlay` は重ね表示、`mine` / `ref` は単体表示です。

## 構成

```
src/
  model/      データモデル（cm 単位・TikZ の向き）と単位変換
  tikz/       geometry.ts: TikZ の描画計算の再実装 / export.ts: コード生成 / colors.ts: xcolor
  tex/        KaTeX によるラベル描画と TeX 寸法の計測
  canvas/     DiagramLayer（TikZ と同じ描画）と Canvas（編集操作）
  store/      zustand ストア（履歴・自動保存）
  ui/         ツールバー・プロパティ・コード表示
```

技術: React 18, TypeScript, Vite, Zustand, KaTeX, Tailwind CSS
