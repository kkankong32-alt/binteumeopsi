import React, { useState } from "react";
import {
  regular,
  diagonals,
  isRegular,
  angles,
  transform,
  type Poly,
} from "./geometry";
import { path } from "./render";
export const cardTitles = [
  "열려 있으면 다각형일까?",
  "다섯 변? 여섯 변?",
  "정다각형의 두 가지 조건",
  "한 꼭짓점의 대각선",
  "모든 대각선 그리기",
  "사각형을 찌그러뜨려도?",
  "정오각형만으로는?",
  "평면을 채우는 정다각형",
  "같은 조각, 다른 작품",
  "빈틈 없이 채우기",
];
export function Learning({
  onExplore,
}: {
  onExplore?: (card: number, target: "studio" | "puzzle") => void;
}) {
  const [card, setCard] = useState(0),
    [n, setN] = useState(5),
    [t, setT] = useState(0),
    [variant, setVariant] = useState(0);
  let p: Poly = regular(n, 70, [110, 95]);
  if (card === 2)
    p =
      variant === 0
        ? [
            [40, 30],
            [180, 30],
            [180, 170],
            [40, 170],
          ]
        : variant === 1
          ? [
              [110, 20],
              [160, 95],
              [110, 170],
              [60, 95],
            ]
          : [
              [30, 50],
              [190, 50],
              [190, 140],
              [30, 140],
            ];
  if (card === 5)
    p = [
      [35 + t, 30],
      [175, 40],
      [180 - t, 155],
      [35, 150],
    ];
  const a = ((n - 2) * 180) / n,
    count = Math.floor(360 / a),
    remain = 360 - count * a;
  let feedback =
    card === 0
      ? [
          "선분으로 닫혀 있어 다각형이에요.",
          "열려 있어 다각형이 아니에요.",
          "굽은 선이 있어 다각형이 아니에요.",
          "변이 교차해 단순한 다각형이 아니에요.",
        ][variant]
      : card === 1
        ? `변 ${n}개, 꼭짓점도 ${n}개예요.`
        : card === 2
          ? `${isRegular(p) ? "두 조건을 모두 만족해요." : "한 조건만 같아서는 정다각형이 아니에요."} 각: ${angles(
              p,
            )
              .map((x) => Math.round(x))
              .join("°, ")}°`
          : card === 3
            ? `한 꼭짓점에서 ${n - 3}개를 그을 수 있어요. 자기 자신과 양옆은 제외해요.`
            : card === 4
              ? `겹쳐 세지 않으면 모두 ${diagonals(n).length}개예요.`
              : card === 5
                ? "변의 중점을 중심으로 180° 돌린 이웃 조각이 맞물려요."
                : card === 6 || card === 7
                  ? `${a.toFixed(1)}° × ${count} = ${(a * count).toFixed(1)}°. 남는 각 ${remain.toFixed(1)}°${remain < 0.001 ? " — 이 정다각형은 평면을 채울 수 있어요." : " — 한 종류로 변끼리 맞대어 채울 수 없어요."}`
                  : card === 8
                    ? "넓이가 같은 두 삼각형을 옮겨 새로운 모양을 만들어요."
                    : t === 0
                      ? "두 조각이 변을 공유하며 빈틈없이 만나요."
                      : t > 0
                        ? `${t}만큼 떨어뜨려 빈틈이 생겼어요.`
                        : `${-t}만큼 포개져 겹침이 생겼어요.`;
  return (
    <div className="learning">
      <div className="card-tabs">
        {cardTitles.map((title, i) => (
          <button
            className={card === i ? "active" : ""}
            onClick={() => {
              setCard(i);
              setVariant(0);
              setT(0);
              setN(i === 6 ? 5 : i === 7 ? 6 : 5);
            }}
            key={title}
          >
            {String(i + 1).padStart(2, "0")} {title}
          </button>
        ))}
      </div>
      <div className="lesson">
        <span className="eyebrow">
          {card >= 5 && card <= 7 ? "심화 · 테셀레이션" : "교과 · 다각형 탐구"}
        </span>
        <h2>{cardTitles[card]}</h2>
        <svg viewBox="0 0 440 220" aria-label="조작형 수학 그림">
          {card <= 5 ? (
            <>
              <path
                d={
                  card === 0 && variant === 1
                    ? "M40 40L180 40L180 160L40 160"
                    : card === 0 && variant === 2
                      ? "M40 40Q230 20 180 160L40 160Z"
                      : card === 0 && variant === 3
                        ? "M40 40L180 160L180 40L40 160Z"
                        : path(p)
                }
                fill="#d7e5df"
                stroke="#245c4f"
                strokeWidth="3"
              />
              {(card === 3 || card === 4) &&
                diagonals(n)
                  .filter(([i]) => card === 4 || i === 0)
                  .map(([i, j]) => (
                    <path
                      key={i + ":" + j}
                      d={`M${p[i]}L${p[j]}`}
                      stroke="#b6673d"
                      strokeWidth="2"
                    />
                  ))}
              {card !== 0 &&
                p.map((v, i) => (
                  <g key={i}>
                    <circle cx={v[0]} cy={v[1]} r="4" fill="#245c4f" />
                    <text x={v[0] + 7} y={v[1]} fontSize="13">
                      {i + 1}
                    </text>
                  </g>
                ))}
              {card === 5 && (
                <path
                  d={path(
                    transform(p, 180, 1, false, [
                      (p[1][0] + p[2][0]) / 2,
                      (p[1][1] + p[2][1]) / 2,
                    ]),
                  )}
                  fill="#dbab7d"
                  stroke="#9b6139"
                />
              )}
            </>
          ) : card === 6 || card === 7 ? (
            Array.from({ length: count }, (_, i) => (
              <path
                key={i}
                d={`M220 110L${220 + 90 * Math.cos((i * a * Math.PI) / 180)},${110 + 90 * Math.sin((i * a * Math.PI) / 180)} A90 90 0 ${a > 180 ? 1 : 0} 1 ${220 + 90 * Math.cos(((i + 1) * a * Math.PI) / 180)},${110 + 90 * Math.sin(((i + 1) * a * Math.PI) / 180)} Z`}
                fill={
                  [
                    "#255c4f",
                    "#88ac9b",
                    "#dfb78b",
                    "#bdd2c7",
                    "#c78c68",
                    "#eee0cb",
                  ][i]
                }
                stroke="white"
              />
            ))
          ) : card === 8 ? (
            <>
              <path d="M60 160L160 160L60 60Z" fill="#255c4f" />
              <path
                d={
                  variant
                    ? "M160 160L260 160L260 60Z"
                    : "M60 60L160 60L160 160Z"
                }
                fill="#dcac7c"
              />
            </>
          ) : (
            <>
              <rect x="80" y="60" width="100" height="100" fill="#255c4f" />
              <rect
                x={180 + t}
                y="60"
                width="100"
                height="100"
                fill="#dbae83"
                opacity=".8"
              />
            </>
          )}
        </svg>
        <div className="lesson-controls">
          {[1, 3, 4, 7].includes(card) && (
            <label>
              변의 수{" "}
              <input
                type="range"
                min="3"
                max="8"
                value={n}
                onChange={(e) => setN(+e.target.value)}
              />
              {n}
            </label>
          )}
          {card === 0 &&
            ["닫힌 선분", "열린 선분", "굽은 선", "교차한 선"].map((v, i) => (
              <button
                className={variant === i ? "active" : ""}
                key={v}
                onClick={() => setVariant(i)}
              >
                {v}
              </button>
            ))}
          {card === 2 &&
            ["정사각형", "마름모", "직사각형"].map((v, i) => (
              <button key={v} onClick={() => setVariant(i)}>
                {v}
              </button>
            ))}
          {[5, 9].includes(card) && (
            <label>
              {card === 5 ? "꼭짓점 움직이기" : "조각 사이 거리"}
              <input
                type="range"
                min="-30"
                max="30"
                value={t}
                onChange={(e) => setT(+e.target.value)}
              />
            </label>
          )}
          {card === 8 && (
            <button onClick={() => setVariant(1 - variant)}>조각 재배치</button>
          )}
          {card === 6 && (
            <button onClick={() => setN(n === 5 ? 6 : 5)}>
              정오각형 / 정육각형 비교
            </button>
          )}
        </div>
        <p className="feedback">{feedback}</p>
        <div className="lesson-links">
          <button
            className="primary"
            onClick={() => onExplore?.(card, "studio")}
          >
            작업실에서 직접 해 보기 →
          </button>
          <button onClick={() => onExplore?.(card, "puzzle")}>
            관련 퍼즐로 도전하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
