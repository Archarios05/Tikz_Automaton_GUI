# 双方向エッジTikZエクスポートテスト

## 改善された機能

### 1. 動的bend角度調整
- **近距離ノード (< 150px)**: 45度の大きな曲線で重なりを完全回避
- **中距離ノード (150-300px)**: 30度の標準的な曲線
- **長距離ノード (> 300px)**: 20度の緩やかで自然な曲線

### 2. 動的looseness調整
- **近距離**: looseness=1.2で曲線を緩やかに
- **遠距離**: looseness=0.8で曲線を引き締める

### 3. TikZ公式記法準拠
- 双方向エッジは2本の独立した単方向曲線として出力
- `bend left=角度`と`bend right=角度`で対称的な曲線
- `looseness=値`でベジェ曲線の形状を最適化
- `node [swap]`で下側エッジのラベル位置を適切に配置

## テスト手順

1. **基本双方向エッジ**
   - 2つのノードを配置（A → B, B → A）
   - 近距離、中距離、長距離でテスト
   - TikZエクスポートで適切な角度とlooseness値を確認

2. **複雑な配置**
   - 縦並び、横並び、斜め配置
   - 複数の双方向エッジが存在する場合
   - 自己ループとの組み合わせ

3. **エクスポート出力例**
```tikz
\usetikzlibrary{automata,positioning}
\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]
  \node[state,initial] (q0) at (0.0,0.0) {$q0$};
  \node[state] (q1) at (2.5,0.0) {$q1$};

  \path[->]
    (q0) edge [bend left=30,looseness=1.2] node {a} (q1)
    (q1) edge [bend right=30,looseness=1.2] node [swap] {b} (q0);
\end{tikzpicture}
```

## 期待される結果

- どのようなノード配置でも双方向エッジが重ならない
- 距離に応じて最適化された美しい曲線
- TikZ automataライブラリの公式記法に完全準拠
- LaTeXでコンパイル可能な高品質な出力
