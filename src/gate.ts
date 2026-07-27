/**
 * 사이트 앞에 두는 간단한 비밀번호 화면.
 *
 * 분명히 해둘 것: 이건 **보안이 아니다.** GitHub Pages는 정적 호스팅이라 서버에서
 * 인증할 방법이 없고, 검사는 전부 브라우저에서 일어난다. 저장소도 public이라
 * 마음먹은 사람은 해시를 보고 우회할 수 있다. 목적은 오직 "주소를 우연히 연 사람이
 * 그냥 되돌아가게" 하는 것 — 진짜 잠금이 필요하면 서버가 있는 호스팅으로 옮겨야 한다.
 *
 * 비밀번호를 코드에 평문으로 두지는 않는다. 소스를 슥 훑어서 바로 보이지는 않도록
 * SHA-256 해시만 담아둔다(위 한계는 그대로).
 */
const PASSWORD_HASH = '81baaad9354fb971d3863ffa6f68652c36c0908d37eac3298d21640e76cb6c65';
const UNLOCKED_KEY = 'site-unlocked';

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkPassword(password: string): Promise<boolean> {
  return (await sha256Hex(password)) === PASSWORD_HASH;
}

/** 한 번 풀면 이 브라우저에서는 계속 열린 상태로 둔다 — 매번 치게 하면 못 쓴다. */
export function isUnlocked(): boolean {
  return localStorage.getItem(UNLOCKED_KEY) === 'yes';
}

export function markUnlocked(): void {
  localStorage.setItem(UNLOCKED_KEY, 'yes');
}

/** 비밀번호 화면. 맞히면 `onUnlock()`을 호출한다. */
export function renderGate(onUnlock: () => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'gate';

  const box = document.createElement('form');
  box.className = 'gate-box card';

  const title = document.createElement('div');
  title.className = 'gate-title';
  title.textContent = 'こんにちは 👋';
  box.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'gate-subtitle';
  subtitle.textContent = '비밀번호를 입력해 주세요.';
  box.appendChild(subtitle);

  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'gate-input';
  input.placeholder = '비밀번호';
  input.autofocus = true;
  box.appendChild(input);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'gate-submit btn btn-primary';
  submit.textContent = '들어가기';
  box.appendChild(submit);

  const error = document.createElement('div');
  error.className = 'gate-error hidden';
  error.textContent = '비밀번호가 맞지 않아요.';
  box.appendChild(error);

  box.addEventListener('submit', (event) => {
    event.preventDefault();
    void checkPassword(input.value).then((ok) => {
      if (ok) {
        markUnlocked();
        onUnlock();
      } else {
        error.classList.remove('hidden');
        input.value = '';
        input.focus();
      }
    });
  });

  container.appendChild(box);
  return container;
}

/**
 * 공용 암호를 지난 뒤의 두 번째 화면 — 내 학습 기록을 여는 개인 비밀번호.
 * 이건 문이 아니라 **열쇠**다. 틀린 비밀번호라는 게 없고, 처음 보는 비밀번호면
 * 그 비밀번호의 새 기록이 시작된다. 폰과 PC에 같은 걸 넣으면 기록이 합쳐진다.
 *
 * 실제로 무엇을 여는지는 이 화면이 모른다 — 저장·연동은 `onSubmit`이 한다.
 */
export function renderPersonalGate(onSubmit: (password: string) => Promise<void>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'gate';

  const box = document.createElement('form');
  box.className = 'gate-box card';

  const title = document.createElement('div');
  title.className = 'gate-title';
  title.textContent = '내 기록 열기 🔑';
  box.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'gate-subtitle';
  subtitle.textContent = '폰과 컴퓨터에 같은 비밀번호를 넣으면 학습 기록이 이어져요.';
  box.appendChild(subtitle);

  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'gate-input';
  input.placeholder = '내 비밀번호';
  input.autofocus = true;
  box.appendChild(input);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'gate-submit btn btn-primary';
  submit.textContent = '열기';
  box.appendChild(submit);

  const error = document.createElement('div');
  error.className = 'gate-error hidden';
  error.textContent = '비밀번호를 입력해 주세요.';
  box.appendChild(error);

  box.addEventListener('submit', (event) => {
    event.preventDefault();
    const password = input.value.trim();
    if (password === '') {
      error.classList.remove('hidden');
      return;
    }
    error.classList.add('hidden');
    submit.disabled = true;
    submit.textContent = '불러오는 중…';
    void onSubmit(password).finally(() => {
      submit.disabled = false;
      submit.textContent = '열기';
    });
  });

  container.appendChild(box);
  return container;
}
