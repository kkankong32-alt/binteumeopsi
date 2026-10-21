import { fresh, shapes, type Project } from "./model";
import { escher } from "./geometry";
export const exampleDescriptions = [
  "자유 사각형 · 숲과 모래 · 무광 세라믹",
  "정삼각형 · 미드나이트 블루 · 유광",
  "정육각형 · 은빛 안개 · 브러시드 금속",
  "팔각형과 사각형 · 테라코타 · 석재",
  "직선 에셔 · 작은 새 · 나무결",
  "곡선 에셔 · 물빛 정원 · 유리",
];
export function createExamples(): Project[] {
  return ["quad", "triangle", "hex", "mixed8", "escher", "curve"].map(
    (key, i) => {
      const p = fresh();
      p.id = `binteumeopsi-example-${i + 1}`;
      p.title = [
        "숲빛의 조각들",
        "밤바다의 돛",
        "은빛 벌집",
        "토스카나의 뜰",
        "작은 새의 여행",
        "물결 위의 날개",
      ][i];
      p.style.palette = [
        ["#224F47", "#80A99C", "#E6B78A", "#F3E9D8"],
        ["#16364B", "#497E93", "#C6A967", "#ECE2CF"],
        ["#334653", "#82969C", "#C2CBC8", "#EBEAE1"],
        ["#874E3B", "#BC7D5D", "#DBC4A1", "#EDE6D6"],
        ["#4E624E", "#98A385", "#CCA276", "#EEE4D1"],
        ["#256876", "#74AAA9", "#D9C29F", "#EDF0E2"],
      ][i];
      p.style.stroke = i === 2 ? "#49565B" : "#F5F1E7";
      p.style.grout = i === 3 ? 2.5 : 0.7;
      p.style.scale = [1, 1.15, 0.85, 1.05, 0.85, 0.9][i];
      p.style.period = i === 1 ? 3 : 4;
      p.style.decoration = i === 2 ? "line" : i === 3 ? "decal" : "solid";
      if (key === "escher" || key === "curve") {
        p.kind = "escher";
        p.escher.curved = key === "curve";
        p.escher.top = [
          [35, -20],
          [78, 18],
        ];
        p.escher.left = [
          [18, 38],
          [-14, 82],
        ];
        p.vertices = escher(p.escher.top, p.escher.left, 120, p.escher.curved);
        p.camera = { x: 60, y: 60, zoom: 1 };
        p.decorations = [
          {
            id: "eye",
            type: "eye",
            x: 80,
            y: 35,
            size: 4.5,
            rotation: -10,
            color: "#243C36",
          },
          {
            id: "wing",
            type: "wing",
            x: 48,
            y: 72,
            size: 23,
            rotation: -24,
            color: p.style.palette[2],
          },
        ];
      } else {
        p.kind = shapes[key].kind;
        p.vertices = structuredClone(shapes[key].p);
        if (key === "quad")
          p.vertices = [
            [-65, -52],
            [55, -65],
            [78, 48],
            [-48, 68],
          ];
        p.locked = ["hex", "mixed8"].includes(key);
      }
      p.showroom.material = [
        "ceramic",
        "gloss",
        "metal",
        "stone",
        "wood",
        "glass",
      ][i];
      p.showroom.scene = ["wall", "wall", "facade", "floor", "wall", "floor"][
        i
      ];
      p.showroom.scale = [1, 1.2, 0.8, 1.3, 1, 1.1][i];
      return p;
    },
  );
}
