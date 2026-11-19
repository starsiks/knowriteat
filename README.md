# 알고 쓰고 먹자 — v2.0

학교 급식 메뉴에서 친숙한 낱말을 골라 점선 따라쓰기 학습지를 만드는 웹앱입니다.

## Netlify와 Vercel 겸용
- Netlify: 프로젝트 전체를 ZIP으로 배포합니다. `netlify.toml`이 API 요청을 Netlify Functions로 연결합니다.
- Vercel: 이 저장소를 GitHub에서 연결합니다. `api/*.mjs`가 Vercel 서버 함수입니다.
- 양쪽 모두 서버 환경변수 `NEIS_API_KEY`를 등록해야 합니다. 인증키는 클라이언트 파일이나 저장소에 넣지 않습니다.
- 브라우저에서 `/api/schools` 및 `/api/meals`을 공통으로 호출하며, 실제 조회 로직은 `lib/neis.mjs`을 공유합니다.

## 학습지
- A4 세로, 상하좌우 10mm 여백
- 음식 낱말 총 9음절 이내 선택
- 날짜·이름 제시 방식 각각 점선/작은 본보기/빈칸
- 따라쓰기 6줄 + 혼자쓰기 2줄 기본, 합계 최대 8줄
- 학생별 설정을 각 브라우저에 저장
- 자체 탑재한 엘점선체로 미리보기 및 PDF 생성

## 글꼴
엘점선체, SIL Open Font License 1.1.
제작자 출처: https://blog.naver.com/cgsjw/224354331923
자세한 라이선스: `OFL.txt`

현재 버전: v2.0 / 업데이트: 2026.11.19.
