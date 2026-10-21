# 자산과 라이선스

## 자체 제작

로고, 타일 좌표, 예제, 퍼즐 목표/풀이, 탐구 그림, 쇼룸 건축 공간과 절차적 대체 가구, 기본 요철/나무결 텍스처, 2.5D 장면은 코드로 제작했습니다. 교과서 사진·유료 스톡·에셔 원작·교과서 페이지 이미지를 배포하지 않습니다.

폰트 파일을 번들하지 않습니다. 설치된 Pretendard가 있으면 로컬 폰트로 사용하고, 없으면 맑은 고딕/system-ui로 대체합니다. 폰트 CDN 요청이 없습니다.

## 런타임 의존성

| 패키지 | 고정 버전 | 라이선스 |
| --- | --- | --- |
| React / React DOM | 19.1.1 | MIT |
| Three.js, RoomEnvironment, RoundedBoxGeometry | 0.180.0 | MIT |
| polygon-clipping | 0.15.7 | MIT |
| lucide-react | 0.468.0 | ISC |
| robust-predicates | 3.0.3 | Unlicense |
| splaytree | 3.2.3 | MIT |
| scheduler | 0.26.0 | MIT |

라이선스 원문은 `licenses/`에 복사했습니다. 개발 도구와 전이 의존성 버전은 `package-lock.json`이 기준입니다.

## 주요 개발 도구

TypeScript 5.9.2 (Apache-2.0), Vite 6.3.6 (MIT), Vitest 3.2.4 (MIT), Playwright Test 1.55.1 (Apache-2.0), Prettier 3.6.2 (MIT).

## 사용자 자료

교과서·익힘책·기존 HTML의 권리는 원권리자에게 있습니다. 이 자료는 사용자의 요청에 따라 분석용으로만 읽었습니다. 원본 ZIP/PDF는 변경하지 않았습니다.

## 최종 검수본의 외부 자산

- Sheen Chair: Wayfair, LLC. / Eric Chadwick, CC0 1.0. Khronos 개별 모델 Legal 확인.
- Potted Plant 02: Rico Cilliers / Poly Haven, CC0 1.0. 원본 glTF/BIN/JPG를 무손실 GLB로 묶었습니다.
- Studio Small 09 HDRI, Marble 01, Wood Table 001, Grey Plaster, Sandstone Cracks: Poly Haven, CC0 1.0.
- 정확한 출처 링크·파일별 SHA-256·가공 내역은 docs/EXTERNAL_ASSETS.md 및 public/assets/showroom/manifest.json에 있습니다. 런타임은 외부 다운로드를 하지 않습니다.
- 홈 배경은 built-in image_gen으로 생성했습니다. 정확한 한국어/영어 문구는 설치된 맑은 고딕을 사용해 래스터 합성했습니다. 글꼴 파일은 포함하지 않습니다. 원본과 가공 치수/해시는 assets/source/hero-provenance.json에 있습니다.
- 3D의 의자 fabric 색조, 주변 건축 albedo, 석재 slab 내부 샘플/목재 grain 대비는 앱에서 조정합니다. 원본 자산 바이너리는 식물 GLB 포장 외 변경하지 않았습니다.
