# knots — Career Branding AI Agent

> 커리어를 위한 3분짜리 음성 메모를 **블로그 · LinkedIn · 릴스 대본 · 스레드** 4가지 콘텐츠 포맷으로 자동 변환하는 AI 서비스.
> "자기 속도로 기록하면, 흩어진 생각이 단단한 커리어 자산이 된다."

### 🔗 [라이브 데모 → knots-ai.lovable.app](https://knots-ai.lovable.app)

**개인 프로젝트.** React + Supabase(Auth · DB · Edge Functions) + OpenAI. Lovable로 프로토타입을 만들고 데이터 모델·RLS·Edge Functions·사용 이벤트 수집 구조를 확장했습니다. AI 도구와 제 기여 범위는 [`CONTRIBUTIONS.md`](./CONTRIBUTIONS.md)에 구분해 두었습니다.

---

## 무엇을 하나

1. **온보딩** — 직군(마케팅 / PM / 데이터 …) + 선호 톤(전문적 / 위트 / 차분) 선택
2. **홈** — 큰 녹음 버튼 + 키워드 칩 3개. 3분 음성 메모 녹음
3. **처리** — "Refracting your story…" (프리즘 모티프 로딩)
4. **결과** — 4개 카드로 생성:
   | 포맷 | 스타일 |
   |---|---|
   | Blog | 구조화된 장문 |
   | LinkedIn | 전문적 인사이트 |
   | Reels | 비주얼 설명 / 오디오 대본 분할 뷰 |
   | Threads | 짧고 위트있는 텍스트 |
5. **액션** — 카드마다 Copy · Save · Regenerate. 저장한 콘텐츠는 개인 라이브러리로

## 아키텍처

```
React (Vite · TypeScript · Tailwind · shadcn/ui)
   │  Supabase Auth (이메일 로그인)
   ▼
Supabase Edge Functions (Deno)
   ├─ process-audio          STT — 음성 → 텍스트
   ├─ refine-output          OpenAI — 톤·직군 반영해 포맷별 재정제
   ├─ regenerate-session     세션 전체 재생성
   ├─ update-and-regenerate  사용자 편집 반영 후 재생성
   ├─ promote-draft          드래프트 → 확정본 승격
   └─ log-event              사용 이벤트 로깅
   ▼
Supabase Postgres  (RLS로 유저별 격리)
   users(id, email, job_role, tone_preference)
   sessions(id, user_id, raw_text, created_at)
   outputs(id, session_id, platform, content, is_saved)
   edits(id, output_id, edit_type, feedback_score)
```

- 클라이언트는 `anon` 키만, 관리자 작업은 Edge Function에서 `service_role`(환경변수)로 실행 — 키를 코드에 하드코딩하지 않음.
- `edits.feedback_score`로 재생성 품질 피드백을 수집하는 구조.

## 화면

![플랫폼별 콘텐츠 생성 결과](./screenshots/results.png)

[라이브 데모](https://knots-ai.lovable.app)에서 입력부터 생성·편집·저장 흐름을 확인할 수 있습니다.

## 로컬 개발

```sh
git clone https://github.com/dbals12/knots-ai.git
cd knots-ai
npm i
cp .env.example .env   # Supabase 값 채우기
npm run dev
```

## Lovable

이 프로젝트는 [Lovable](https://lovable.dev)와 함께 구현했으며, [Lovable 에디터](https://lovable.dev/projects/5dfb626d-9d5a-4e3e-b8dd-ce8424cdfc7e)와 GitHub `main`이 양방향 동기화됩니다. 이 때문에 과거 커밋의 대부분은 `lovable-dev[bot]`으로 표시됩니다. 제품 정의와 설계·검증 책임을 코드 생성 이력과 혼동하지 않도록 기여 범위를 별도로 공개합니다.
