import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPassword, isUnlocked, markUnlocked, renderGate } from './gate';

const PASSWORD = 'qkqhsmqkqhsm';

describe('checkPassword', () => {
  it('accepts the real password', async () => {
    expect(await checkPassword(PASSWORD)).toBe(true);
  });

  it('rejects anything else, including near misses', async () => {
    expect(await checkPassword('')).toBe(false);
    expect(await checkPassword('qkqhsm')).toBe(false);
    expect(await checkPassword('QKQHSMQKQHSM')).toBe(false);
    expect(await checkPassword(`${PASSWORD} `)).toBe(false);
  });
});

describe('unlock state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts locked and stays unlocked once marked', () => {
    expect(isUnlocked()).toBe(false);
    markUnlocked();
    expect(isUnlocked()).toBe(true);
  });
});

describe('renderGate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function submit(gate: HTMLElement, password: string): void {
    gate.querySelector<HTMLInputElement>('.gate-input')!.value = password;
    gate.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  it('unlocks and calls back when the password is right', async () => {
    const onUnlock = vi.fn();
    const gate = renderGate(onUnlock);

    submit(gate, PASSWORD);
    await vi.waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
    expect(isUnlocked()).toBe(true);
  });

  it('shows an error and stays locked on a wrong password', async () => {
    const onUnlock = vi.fn();
    const gate = renderGate(onUnlock);
    const error = gate.querySelector('.gate-error')!;
    expect(error.classList.contains('hidden')).toBe(true);

    submit(gate, 'wrong-password');
    await vi.waitFor(() => expect(error.classList.contains('hidden')).toBe(false));

    expect(onUnlock).not.toHaveBeenCalled();
    expect(isUnlocked()).toBe(false);
    // The field is cleared so the next attempt starts fresh.
    expect(gate.querySelector<HTMLInputElement>('.gate-input')!.value).toBe('');
  });
});
