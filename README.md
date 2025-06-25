# TikZ Automaton GUI - ビジュアル・オートマトンエディタ

![TikZ Automaton GUI](./preview.png)

## 概要

TikZ Automaton GUIは、LaTeXのTikZ automataライブラリの機能をプログラミング知識のないユーザーでも直感的かつグラフィカルに利用できるWebアプリケーションです。ユーザーはキャンバス上でノード（状態）やエッジ（遷移）を直接操作することにより、最終的にTikZコードとして出力可能なオートマトンを視覚的に構築できます。
このプロジェクトは主にGemini2.5、ClaudeSonnet4を用いて作成されました。

## 主な機能


- **選択モード (V)**: オブジェクトの選択、移動、編集
- **ノード追加モード (N)**: クリックでノード（状態）を追加
- **エッジ追加モード (E)**: ドラッグ&ドロップでエッジ（遷移）を追加

- **ノード設定**: ラベル、色、サイズ、状態タイプ（受理状態、初期状態、開始点）
- **エッジ設定**: ラベル、線の色・スタイル、曲がり方向、ラベル位置
- **リアルタイムプレビュー**: 変更がすぐに反映

- **Undo/Redo (Ctrl+Z/Y)**: 完全な操作履歴（未実装）
- **右クリックメニュー**: 素早い設定変更とプロパティアクセス
- **プロパティインスペクタ**: 詳細な設定パネル
- **グリッド表示 (Ctrl+G)**: 正確な配置のためのガイド

### 📤 TikZエクスポート
- **ワンクリックエクスポート**: 作成したオートマトンをTikZコードとして出力
- **クリップボードコピー**: すぐにLaTeX文書に貼り付け可能

## インストールと起動

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:5173 にアクセス
```

## プロダクションビルド

```bash
# プロダクション用にビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

### TikZエクスポート

1. ツールバーのエクスポートボタン (📤) をクリック
2. TikZコードがクリップボードにコピーされます
3. LaTeX文書の`tikzpicture`環境内に貼り付けて使用

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 参考資料

- [TikZ automata documentation](https://tikz.dev/library-automata)
- [React Flow documentation](https://reactflow.dev/)
- [Shadcn/ui components](https://ui.shadcn.com/)
