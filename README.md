# TikZ Automaton GUI - ビジュアル・オートマトンエディタ

![TikZ Automaton GUI](./preview.png)

## 概要

TikZ Automaton GUIは、LaTeXのTikZ automataライブラリの機能をプログラミング知識のないユーザーでも直感的かつグラフィカルに利用できるWebアプリケーションです。ユーザーはキャンバス上でノード（状態）やエッジ（遷移）を直接操作することにより、最終的にTikZコードとして出力可能なオートマトンを視覚的に構築できます。

## 主な機能

### ✨ 直感的な操作
- **選択モード (V)**: オブジェクトの選択、移動、編集
- **ノード追加モード (N)**: クリックでノード（状態）を追加
- **エッジ追加モード (E)**: ドラッグ&ドロップでエッジ（遷移）を追加

### 🎨 豊富なカスタマイズ
- **ノード設定**: ラベル、色、サイズ、状態タイプ（受理状態、初期状態、開始点）
- **エッジ設定**: ラベル、線の色・スタイル、曲がり方向、ラベル位置
- **リアルタイムプレビュー**: 変更がすぐに反映

### 🔧 強力な編集機能
- **Undo/Redo (Ctrl+Z/Y)**: 完全な操作履歴
- **右クリックメニュー**: 素早い設定変更とプロパティアクセス
- **プロパティインスペクタ**: 詳細な設定パネル
- **グリッド表示 (Ctrl+G)**: 正確な配置のためのガイド

### 📤 TikZエクスポート
- **ワンクリックエクスポート**: 作成したオートマトンをTikZコードとして出力
- **クリップボードコピー**: すぐにLaTeX文書に貼り付け可能

## 技術スタック

- **React 18** + **TypeScript**: モダンなUI開発
- **React Flow**: ノードベースのビジュアルエディタ
- **Zustand + Zundo**: 軽量な状態管理とUndo/Redo
- **Shadcn/ui + Radix UI**: 高品質でアクセシブルなUIコンポーネント
- **Tailwind CSS**: 効率的なスタイリング
- **Lucide React**: 美しいアイコン
- **Vite**: 高速な開発環境

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

## 使い方

### 基本操作

1. **ノードの追加**: ツールバーのノード追加ボタン (🔵) をクリックし、キャンバス上の任意の場所をクリック
2. **エッジの追加**: エッジ追加ボタン (🔗) をクリックし、ノード間をドラッグ&ドロップ
3. **選択と編集**: 選択モード (👆) でオブジェクトをクリックして選択、ダブルクリックでラベル編集
4. **プロパティ設定**: 右クリックメニューから「プロパティ...」を選択

### キーボードショートカット

- **V**: 選択モード
- **N**: ノード追加モード
- **E**: エッジ追加モード
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+G**: グリッド表示切替
- **Space + ドラッグ**: キャンバスの移動
- **マウスホイール**: ズーム

### TikZエクスポート

1. ツールバーのエクスポートボタン (📤) をクリック
2. TikZコードがクリップボードにコピーされます
3. LaTeX文書の`tikzpicture`環境内に貼り付けて使用

```latex
\documentclass{article}
\usepackage{tikz}
\usetikzlibrary{automata,positioning}

\begin{document}
% ここにエクスポートしたコードを貼り付け
\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]
  \node[state,initial] (q0) at (0,0) {q0};
  \node[state,accepting] (q1) at (2,0) {q1};
  \path[->] (q0) edge node {a} (q1);
\end{tikzpicture}
\end{document}
```

## 開発への貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 参考資料

- [TikZ automata documentation](https://tikz.dev/library-automata)
- [React Flow documentation](https://reactflow.dev/)
- [Shadcn/ui components](https://ui.shadcn.com/)
