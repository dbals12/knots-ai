# 기여와 AI 도구 사용 범위

이 저장소는 이유민(`dbals12`)의 개인 프로젝트입니다. 제품 문제와 사용자 흐름을 정의하고, Lovable을 구현 도구로 사용해 반복적으로 프로토타입을 만든 뒤 Supabase와 분석 구조를 확장했습니다.

Lovable과 GitHub가 양방향으로 동기화되기 때문에 과거 구현 커밋 대부분의 작성자는 `lovable-dev[bot]`으로 표시됩니다. 따라서 커밋 작성자 수를 직접 작성한 코드 줄 수로 해석하지 않습니다. 아래에는 제가 책임진 판단과 검증 범위를 구체적으로 적었습니다.

## 담당한 범위

- **제품 정의**: 3분 음성 기록을 블로그·LinkedIn·Instagram·Threads 네 포맷으로 바꾸는 흐름과 온보딩 정보(직군·톤·사용 목적) 정의
- **데이터 모델**: 사용자, 세션, 출력물, 편집 피드백을 분리하고 가입 전 작성 내용을 가입 후 계정으로 이어받는 구조 설계
- **접근 제어**: Supabase Auth와 Postgres RLS를 이용한 사용자별 데이터 격리, 관리자 권한은 Edge Function 환경변수에서만 사용
- **AI 처리 흐름**: 음성 인식 → 원문 재정제 → 포맷별 생성 → 부분/전체 재생성을 여섯 Edge Function으로 분리
- **측정 구조**: GA4·Meta Pixel·Supabase 이벤트를 같은 이벤트 이름으로 기록하고 유입 정보, 입력 순서, 로그인 전후 전환을 연결
- **검증**: 라이브 데모에서 입력 → 생성 → 편집·재생성 → 저장 흐름과 Supabase 저장 결과 확인

## 코드에서 확인할 수 있는 근거

| 판단 | 구현 위치 |
|---|---|
| 로그인 전 입력 복원과 가입 후 이어받기 | `src/lib/pendingSubmission.ts`, `src/lib/guestPendingSubmission.ts`, `src/pages/AuthCallback.tsx` |
| 세션별 입력 순서 추적 | `src/lib/session.ts` |
| 유입 정보 보존 | `src/lib/acquisition.ts` |
| GA4·Meta Pixel·Supabase 동시 이벤트 기록 | `src/lib/track.ts` |
| STT와 콘텐츠 생성 분리 | `supabase/functions/process-audio/`, `refine-output/`, `regenerate-session/` |
| 사용자별 데이터 격리 | `supabase/migrations/`의 RLS 정책 |

## AI 협업 원칙

AI 도구가 만든 결과를 그대로 기여 증거로 삼지 않습니다. 사용자 흐름, 데이터 경계, 권한, 이벤트 정의를 먼저 정하고 구현 결과를 코드·브라우저·데이터베이스에서 확인했습니다. 현재 저장소는 이 과정을 투명하게 보여 주기 위해 도구 사용 사실과 검증 가능한 파일을 함께 공개합니다.
