// 로컬 날짜 기준 'YYYY-MM-DD'. UTC를 쓰면 KST(UTC+9)에서 오전 9시 이전이 전날로
// 잡혀서, "오늘 공부했나" 같은 사용자 체감 하루와 어긋난다.
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
