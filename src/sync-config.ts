/**
 * 학습 기록을 올려둘 곳. Supabase 프로젝트를 만들고 Settings › API에서 두 값을
 * 복사해 넣으면 그때부터 기기 간 연동이 켜진다. 비어 있으면 연동은 통째로 꺼지고
 * 앱은 지금까지처럼 이 브라우저에만 저장한다.
 *
 * anon key는 어차피 브라우저로 내려가는 공개 값이다. 남의 기록을 지키는 건 이 키가
 * 아니라 개인 비밀번호의 해시(= 칸 이름)이고, 서버 쪽은 그 이름을 아는 사람에게만
 * 그 칸을 내주도록 막아둔다. MDs/Workflow.md의 SQL 참고.
 */
// 타입을 string으로 못 박아 둔다 — 리터럴 타입이면 아래 빈 문자열 비교가
// "일어날 수 없는 비교"로 잡혀서, 값을 지웠을 때만 컴파일되는 코드가 된다.
export const SUPABASE_URL: string = 'https://novjkxvjnuhcrlirqhwe.supabase.co';
export const SUPABASE_ANON_KEY: string = 'sb_publishable_C8QlmFrHZeTMtqnojF3I4A_V82CuNoO';

/**
 * 개인 비밀번호를 해싱할 때 앞에 붙이는 고정 문자열. 이게 없으면 칸 이름이 흔한
 * 비밀번호의 SHA-256 그대로여서, 미리 만들어둔 표만 있으면 누가 남의 칸을 열어볼 수
 * 있다. 공개된 값이라 완벽한 방어는 아니고 — 그래서 비밀번호 자체가 짧으면 안 된다.
 */
export const SYNC_SALT = 'studylanguage-2026-progress:';

export function isSyncConfigured(): boolean {
  return SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
}
