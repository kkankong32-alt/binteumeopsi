# 외부 쇼룸 에셋 — 출처·라이선스·변경 기록

## 2026-10-21 파사드 미감 마감

신규 외부 바이너리: **0개 / 0 bytes**. 기존 15개 파일의 라이선스와 원본 해시는 유지한다.

- 창호 후보로 [Kenney Building Kit](https://kenney.nl/assets/building-kit)의 공식 CC0·3D·80종 안내와 [Poly Haven 모델 목록](https://polyhaven.com/models)의 롤러셔터 창 계열을 검토했다. 개별 GLB를 다운로드하거나 적합성을 실측한 것은 아니다. 이번 장면에는 정확한 개구부 치수와 16:9 UV 보존이 필요해 외부 창호는 채택하지 않고 `src/facade.ts`의 자체 형상을 사용했다.
- 창 개구부·알루미늄 창틀·유리·창턱 물끊기·접힌 금속 차양·보도 슬랩은 코드로 구성했다. 외부 모델에서 추출하지 않았다.
- Grey Plaster의 기존 로컬 color/normal/roughness를 회벽과 미세한 무광 슬랩에 재사용한다. 슬랩은 회색으로 중화한 color map(detail .16), normalScale .12로 강도를 낮춘 디자인 시뮬레이션이며 실제 포세린 재료 측정 데이터가 아니다.
- 66개 보도 슬랩은 동일 geometry/material을 공유하는 InstancedMesh다. 슬랩 사이 0.03 단위 실제 간격 아래 별도 줄눈 바탕이 있다.
- 외벽에서 절차적 화분 및 GLB 식물 배치를 모두 제거했다. 식물은 실내 벽/바닥 세트에만 남는다.
- 로컬 PBR 로드 실패 시 기존 단색 재질과 기존 에셋 실패 안내/대체 모드를 유지한다. 새 외부 요청이나 추가 로더가 없다.
- 파사드 패턴 메시의 실제 창 개구부가 표면 마스크다. UV는 전체 10×5.625 영역 기준으로 유지하므로 창 때문에 패턴이 늘어나지 않는다.
- 이 결과는 실사 사진 합성이 아닌 절제된 3D 건축 시뮬레이션이다. 2.5D 대체 모드는 기존 간소화 표현을 보존했으며 새 3D 건축 디테일과 동등하다고 주장하지 않는다.

확인/다운로드: 2026-10-20. 모든 파일은 앱에 포함되는 로컬 파일이다. 런타임 CDN/API 연결은 필요하지 않다. 총 15개 파일, 13,436,436 bytes (12.81 MiB). 식물의 무손실 GLB 포장 외에는 원본 바이너리를 수정하거나 재압축하지 않았다. 런타임 재질 색조/배치/크기 조절은 별도 소스에서 이루어질 수 있다. 파일별 원본 URL, 크기, SHA-256, 이미지 치수의 기계 판독 기록은 `public/assets/showroom/manifest.json`이다.

## 라이선스 검증

- [Poly Haven 공식 라이선스](https://polyhaven.com/license): HDRI, 텍스처, 모델을 CC0로 제공하며 원본 파일 재배포와 제품 포함을 허용한다. 로고, 웹사이트 텍스트, 예시 렌더는 별개이므로 가져오지 않았다. [CC0 1.0 법문](https://creativecommons.org/publicdomain/zero/1.0/legalcode).
- [Khronos Sheen Chair 개별 저작권](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/SheenChair/README.md): © 2020 Wayfair, LLC.; Eric Chadwick; CC0 1.0 Universal. Khronos 저장소 전체에 일괄 라이선스를 추정하지 않고 이 모델의 Legal 항목을 확인했다.
- [ambientCG 공식 라이선스](https://docs.ambientcg.com/license/)도 검토했으나 이 패키지에는 ambientCG 파일을 포함하지 않았다.
- Poly Haven 메타데이터는 [공식 API 약관](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md)을 확인해 제한된 다운로드 URL 탐색에만 사용했다. 앱은 라이브 API를 사용하지 않는다. Powered by Poly Haven — 감사 표기이며 제휴를 뜻하지 않는다.

## 에셋별 용도

| 에셋 | 출처 | 포함 파일/해상도 | 권장 적용 |
|---|---|---|---|
| Sheen Chair | [Khronos / Wayfair / Eric Chadwick](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair) | sheen-chair.glb, 4,125,648 bytes | 벽/바닥 쇼룸의 실제 곡면 가구; 패턴 표면을 가리지 않는 주변 위치 |
| Studio Small 09 | [Poly Haven](https://polyhaven.com/a/studio_small_09) | studio-small-09.hdr, 1024×512, 1,615,248 bytes | PMREM 기반 실내 조명/반사; 배경 사진으로 사용하지 않음 |
| Marble 01 | [Poly Haven](https://polyhaven.com/a/marble_01) | marble_01-{color,normal,roughness}.jpg, 각각 1024×1024 | 석재 패턴의 normal/roughness 또는 주변 테이블 |
| Wood Table 001 | [Poly Haven](https://polyhaven.com/a/wood_table_001) | wood_table_001-{color,normal,roughness}.jpg, 각각 1024×1024 | 목재 결; 주변 가구 또는 학생 패턴과 분리된 normal/roughness |
| Grey Plaster | [Poly Haven](https://polyhaven.com/a/grey_plaster) | grey_plaster-{color,normal,roughness}.jpg, 각각 1024×1024 | 패턴 주변의 무광 회벽; normalScale을 낮춰 과장 방지 |
| Sandstone Cracks | [Poly Haven](https://polyhaven.com/a/sandstone_cracks) | sandstone_cracks-{color,normal,roughness}.jpg, 각각 1024×1024 | 외벽/보도 석재; 균열 normal은 작은 강도로 사용 |

## 적용 표면과 색 보존 정책

학생 패턴은 프로젝트 좌표를 사용하는 전용 wall/floor/facade 평면의 color map이다. 의자, 회벽, 바닥 주변부, 창문에는 그 패턴을 덮어씌우지 않는다. 사진 배경 위에 합성하지 않으므로 사진용 분할 마스크가 없으며, 실제 Three.js 메시 경계가 적용 표면 마스크 역할을 한다. 사용자 패턴 색을 보존하려면 PBR 파일의 color를 패턴의 color map 대신 사용하지 않고 normal/roughness를 추가한다. 주변 건축/가구에만 원래 color 맵을 사용한다.

## 구현 참고 / 로딩 한계

- Three.js GLTFLoader에 직접 읽을 수 있는 self-contained GLB이다. Draco/KTX2/외부 텍스처 요청 없음. 39,936 triangles, 4 mesh nodes. Y-up이며 대략 폭 0.826558m × 높이 0.686247m × 깊이 0.570265m. bounds min=(-0.4140224,-0.0000698,-0.2767251), max=(0.4125356,0.6861773,0.2935404). 방이 meter 단위이면 scale 약 1–1.1로 배치 가능; 바닥 y는 min 보정.
- 재질: `fabric Mystere Mango Velvet`, `wood Brown`, `metal`, `label`; 선택 variant에 `fabric Mystere Peacock Velvet`, `wood Black`. 기본은 주황 velvet. `KHR_texture_transform` 필수, `KHR_materials_sheen`/`KHR_materials_variants` 사용. Three GLTFLoader는 sheen/texture transform을 처리하지만 variant 자동 선택은 하지 않는다. 기본 재질로 사용하거나 복제한 fabric 재질만 의도적으로 색조 조정한다. 원본 UV/AO UV2를 보존한다.
- HDRI는 RGBELoader → PMREMGenerator.fromEquirectangular 후 환경으로만 사용. 로드 완료 시 기존 renderer에 적용하고 임시 HDR texture/이전 PMREM target을 dispose. 로딩 중에는 기존 절차적 환경 유지.
- color JPG만 SRGBColorSpace; normal/roughness는 NoColorSpace. normal은 OpenGL +Y이므로 DirectX 반전 금지. RepeatWrapping, repeat의 실제 스케일은 메시 면적에 맞춘다. 거친 normalScale은 표면 색을 탁하게 보이게 할 수 있으므로 0.05–0.3부터 비교.
- 쇼룸에 진입한 후 한 번만 비동기 로드/캐시; dispose 후 늦게 완료된 promise는 적용하지 않음. 2.5D 모드는 이 모델/HDR을 요청할 필요 없음. 실패 시 기존 절차적 씬을 유지하며 오류를 숨겨 '로드 성공'이라고 기록하지 않음.
- 1K 표면 이미지는 4K 이미지의 픽셀 단위 실사 디테일을 보장하지 않는다. 이 구성은 실제 PBR 에셋을 사용하는 절제된 3D 시뮬레이션이며, 실내 사진 기반 실사 목업이라고 부르지 않는다.

## 파일 무결성

| 파일 | bytes | SHA-256 |
|---|---:|---|
| sheen-chair.glb | 4125648 | `f0af2a2b102d28d540236306ae19f8fb36842df76bd38cf76f063f9bd2853399` |
| studio-small-09.hdr | 1615248 | `e7cfda5f4e98e623db12b8bfd0184e048488e4855d9c83e2751fb44a32e80c45` |
| marble_01-color.jpg | 305029 | `b10dabea976d68baa976a0d4e8dac58789df8d26a1b50697f320106f1b00a229` |
| marble_01-normal.jpg | 110230 | `77c2a9b549a6a408659f8197be91945aeb0abc33e697f1dd2ce24ee8dc7c2bc0` |
| marble_01-roughness.jpg | 91848 | `a3e9f373d22aebc449af73f6a18c9817e2146f17e567a083609ba8fbb62a72f5` |
| wood_table_001-color.jpg | 215573 | `460dd08d240f4a1f02982415048c3c5c200f385db212da18dc7e2df68bf4d0be` |
| wood_table_001-normal.jpg | 51927 | `9bf7ddf5721e225c20290f1772ae37f9bdfd49658f6d458259eb794e2149d3cf` |
| wood_table_001-roughness.jpg | 237261 | `a2ca9ae89dfe7b8e2e5e92f0aa43467845417de8a50205b5852ef0d57c7624f9` |
| grey_plaster-color.jpg | 704079 | `dcf34c5f3801cc43189f0edae3c430b602c827956e9d6ce4b89a85e53e952da9` |
| grey_plaster-normal.jpg | 355288 | `85fe18209cb354b582003892898ee0cd6fe6b853644e01983718fc011140c0c2` |
| grey_plaster-roughness.jpg | 635335 | `67566b1b5ee25502596916303c246b08d47725b8a697283cfdc1494e6f659aa2` |
| sandstone_cracks-color.jpg | 696657 | `cf381bbcf60aac570ce895719025a2b7adae7c03369b3d545b4f52f94e57e0e9` |
| sandstone_cracks-normal.jpg | 1307622 | `cb983540cae33979e79862fe27b4ec23a5d41c627230d3730e9d5ff6671859f9` |
| sandstone_cracks-roughness.jpg | 352483 | `4995b3ce148ceef48ea3bc0b83a8799fd0bf38e00c75677ff2de857a7d4cbdbb` |

정확한 개별 다운로드 URL은 동봉 manifest.json의 url 필드에 기록했다. 모델/텍스처 렌더링 통합 및 브라우저 검증은 이 파일 확보 단계의 완료와 별개이며, 최종 QA 결과를 따른다.


## 추가 식물 모델 — Potted Plant 02

- 출처: [Poly Haven 개별 에셋 페이지](https://polyhaven.com/a/potted_plant_02). 제작자 Rico Cilliers. 페이지의 CC0 License 및 [공식 라이선스](https://polyhaven.com/license)를 확인했다.
- 파일: `public/assets/showroom/potted-plant-02.glb`, 2,632,208 bytes (2.51 MiB), SHA-256 `dd9a5dc288f57a07ecd8eda2c98a6c1ee8d548344f1a4bba4f08b2e3bee894fe`.
- 변경: 공식 1K glTF + BIN + 6 JPG를 **무손실 self-contained GLB**로 묶었다. JSON 이미지 URI를 내부 bufferView로 치환했으며 정점, 인덱스, 재질, 텍스처 이미지 바이트는 유지했다. 별도 텍스처/디코더 요청 없음. 원본 8파일의 다운로드 URL·크기·SHA-256은 manifest 해당 항목 sources에 기록했다.
- glTF Y-up, 원본 좌표 기준 bounds min=(-0.396660,0.000053,-0.420313), max=(0.304497,0.841232,0.237074). 폭 0.701157m × 높이 0.841179m × 깊이 0.657387m. 실제 geometry accessor bounds와 node translation을 합산한 값이다. 바닥 y≈0. 의도적으로 크기를 바꾸면 비율을 동일하게 유지한다.
- 69,806 triangles, pot/leaves/dirt 3 meshes, 재질 `potted_plant_02_pot`, `potted_plant_02_leaves`. 그림자는 적용하되 다수 복제는 피하고, 방당 1개 정도를 패턴 바깥 주변에 배치한다. 기존 구형 잎 오브젝트를 대체하는 용도다.
- 전체 런타임 에셋 15개, 총 13,436,436 bytes (12.81 MiB).
- 모델 다운로드·GLB 구조 검증과 장면 내 시각/로딩 통합을 완료했다. 브라우저 검증 결과와 미검증 기기는 최종 QA 보고서에 기록한다.

## 최종 통합 기록

전체 15개 런타임 에셋 13,436,436 bytes를 세 공간에 통합했습니다. 의자는 벽/바닥, 식물은 세 공간에 배치했습니다. HDRI와 절차적 소프트박스 두 개를 하나의 PMREM 환경으로 합성해 유광의 반사를 확보했습니다. 초기 절차적 환경 1회와 로드 후 환경 1회이며 조작 중 재생성하지 않습니다.

건축물 color map은 원래 사진의 미세 명암을 보존하면서 중성 팔레트로 렌더링합니다. 사용자 패턴의 석재/목재에는 사진 명암을 정규화한 grain을 곱하고 같은 PBR normal/roughness를 적용합니다. 단순 전체 색 어둡게 하기로 재질을 구분하지 않습니다. Marble 01은 벽돌 줄눈이 포함되어 있어 패턴 표면용으로 (720,232,290,205)의 slab 내부를 런타임에 추출하고 세 PBR 맵에 동일 적용합니다. MirroredRepeat로 재반복하며 원본 파일을 덮어쓰지 않습니다. 원본 1K/샘플 해상도 한계는 유지됩니다.

조각 표면은 별도 16:9 메시입니다: 벽 8.4×4.725, 바닥 10.6×5.9625, 외벽 10×5.625. 창·가구·식물이 실제 깊이에 따라 가리며 사진 마스크를 흉내 내지 않습니다.

외부 파일 실패 시 해당 에셋만 절차적 대체로 남고 앱/내보내기는 계속 동작합니다. 홈은 이 12.81 MiB를 요청하지 않으며 쇼룸 진입 후 지연 로드합니다. 엔진 해제 시 텍스처·지오메트리·재질·PMREM·렌더러를 dispose하고 늦게 도착한 비동기 결과도 폐기합니다. 브라우저 반복 검증의 관찰 범위는 최종 QA를 따릅니다.
