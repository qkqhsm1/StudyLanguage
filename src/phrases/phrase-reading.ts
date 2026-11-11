// 처음 한 번은 17MB 사전을 받으므로 느린 연결도 기다려 준다.
const READING_TIMEOUT_MS = 90_000;

interface Reply { id: number; reading?: string; error?: string }

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, { resolve: (reading: string) => void; reject: (error: Error) => void }>();

function startWorker(): Worker {
  const started = new Worker(new URL('./reading.worker.ts', import.meta.url), { type: 'module' });
  started.onmessage = (event: MessageEvent<Reply>) => {
    const { id, reading, error } = event.data;
    const request = waiting.get(id);
    waiting.delete(id);
    if (reading !== undefined) request?.resolve(reading);
    else request?.reject(new Error(error ?? 'reading failed'));
  };
  started.onerror = () => {
    for (const request of waiting.values()) request.reject(new Error('reading worker failed'));
    waiting.clear();
    started.terminate();
    worker = null;
  };
  return started;
}

/** 일본어 문장의 읽기를 만든다. 분석은 작업자(worker)에서 해서 화면이 멈추지 않는다. */
export function guessReading(japanese: string): Promise<string> {
  worker ??= startWorker();
  const id = nextId++;
  const active = worker;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    active.postMessage({ id, japanese });
    // 사전을 못 받으면 분석기가 답을 안 줄 수 있다. 버튼이 '만드는 중'에 영영 머물지 않게 끊는다.
    setTimeout(() => {
      if (!waiting.delete(id)) return;
      reject(new Error('reading timed out'));
      // 멈춘 작업자는 버리고 다음에 누를 때 새로 시작한다.
      if (worker === active) {
        active.terminate();
        worker = null;
      }
    }, READING_TIMEOUT_MS);
  });
}
