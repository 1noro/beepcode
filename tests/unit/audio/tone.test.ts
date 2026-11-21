import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTone, type Tone } from '../../../src/audio/tone.ts';

// The audio with a fake AudioContext whose clock the test moves by hand, and
// a fake wall clock (timers and performance.now). What matters is what ends
// up scheduled on the gain: when the tone goes up and down, by the audio
// clock.

type Event = [kind: 'set' | 'ramp' | 'hold', value: number, at: number];

class FakeParam {
  value = 0;
  events: Event[] = [];
  setValueAtTime(value: number, at: number) {
    this.events.push(['set', value, at]);
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.events.push(['ramp', value, at]);
  }
  cancelAndHoldAtTime(at: number) {
    this.events.push(['hold', 0, at]);
  }
  cancelScheduledValues() {}
}

class FakeNode {
  connect<T>(node: T): T {
    return node;
  }
  start() {}
}

class FakeContext {
  static last: FakeContext;
  static initialState: AudioContextState = 'running';
  /** Whether the browser lets it start now (a gesture that may). */
  static allowStart = true;
  state: AudioContextState = FakeContext.initialState;
  currentTime = 0;
  baseLatency = 0;
  destination = new FakeNode();
  gain = new FakeParam();
  keepAlive: number | null = null;
  resumes = 0;
  constructor() {
    FakeContext.last = this;
  }
  createOscillator() {
    return Object.assign(new FakeNode(), { type: 'sine', frequency: new FakeParam() });
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: this.gain });
  }
  createConstantSource() {
    const offset = new FakeParam();
    const source = Object.assign(new FakeNode(), {
      offset,
      start: () => {
        this.keepAlive = offset.value;
      },
    });
    return source;
  }
  resume() {
    this.resumes++;
    if (!FakeContext.allowStart) return Promise.reject(new Error('not allowed'));
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

const settings = { frequency: 600, volume: 1, muted: false };
const LEAD = 0.005;

/** The gain's events, rounded to the ms, without the holds. */
const scheduled = () =>
  FakeContext.last.gain.events
    .filter(([kind]) => kind !== 'hold')
    .map(([kind, value, at]) => [kind, value, Math.round(at * 1000)]);

/** The audio clock starts to move, and the tone looks at it. */
function clockStarts(at: number): void {
  FakeContext.last.currentTime = at;
  vi.advanceTimersByTime(10);
}

let tone: Tone;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('window', { AudioContext: FakeContext });
  FakeContext.initialState = 'running';
  FakeContext.allowStart = true;
  tone = createTone(settings);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the tone, once the audio clock moves', () => {
  it('goes up when the key goes down, and down when it goes up', () => {
    tone.unlock();
    FakeContext.last.currentTime = 1;
    tone.start();
    FakeContext.last.currentTime = 1.1;
    tone.stop();
    expect(scheduled()).toEqual([
      ['ramp', 1, 1010],
      ['ramp', 0, 1110],
    ]);
  });

  it('beeps by the audio clock', () => {
    tone.unlock();
    FakeContext.last.currentTime = 2;
    tone.beep(100, 80);
    expect(scheduled()).toEqual([
      ['set', 0, 2105],
      ['ramp', 1, 2110],
      ['set', 1, 2185],
      ['ramp', 0, 2190],
    ]);
  });

  it('keeps a signal too low to hear, so that the output does not fall asleep', () => {
    tone.unlock();
    expect(FakeContext.last.keepAlive).toBeGreaterThan(0);
    expect(FakeContext.last.keepAlive).toBeLessThanOrEqual(1e-4);
  });
});

describe('the tone, while the audio clock is still (just started)', () => {
  it('a press and release sound, once it moves, as long as they were', () => {
    tone.unlock();
    tone.start();
    vi.advanceTimersByTime(80);
    tone.stop();
    expect(scheduled()).toEqual([]);
    clockStarts(0.4);
    expect(scheduled()).toEqual([
      ['set', 0, 405],
      ['ramp', 1, 410],
      ['set', 1, 485],
      ['ramp', 0, 490],
    ]);
  });

  it('a key still down when it moves sounds, late, for the whole press', () => {
    tone.unlock();
    tone.start();
    vi.advanceTimersByTime(50);
    clockStarts(0.3);
    expect(scheduled()).toEqual([['ramp', 1, 310]]);
    vi.advanceTimersByTime(250);
    FakeContext.last.currentTime = 0.45;
    tone.stop();
    // Down 310 ms after it went up: the whole press, not the 145 ms the clock
    // has run since then.
    expect(scheduled()[1]).toEqual(['ramp', 0, 620]);
  });

  it('beeps keep their lengths and the gaps between them', () => {
    tone.unlock();
    tone.beep(0, 100);
    tone.beep(300, 100);
    clockStarts(1);
    expect(scheduled()).toEqual([
      ['set', 0, 1005],
      ['ramp', 1, 1010],
      ['set', 1, 1105],
      ['ramp', 0, 1110],
      ['set', 0, 1305],
      ['ramp', 1, 1310],
      ['set', 1, 1405],
      ['ramp', 0, 1410],
    ]);
  });

  it('what ended long ago no longer sounds', () => {
    tone.unlock();
    tone.beep(0, 100);
    vi.advanceTimersByTime(1500);
    clockStarts(2);
    expect(scheduled()).toEqual([]);
  });

  it('cancel drops what waited', () => {
    tone.unlock();
    tone.beep(0, 100);
    tone.cancel();
    clockStarts(1);
    expect(scheduled()).toEqual([['ramp', 0, LEAD * 2000]]);
  });

  it('whenReady waits for the clock, or for a while at most', async () => {
    tone.unlock();
    let ready = false;
    void tone.whenReady().then(() => (ready = true));
    vi.advanceTimersByTime(50);
    await Promise.resolve();
    expect(ready).toBe(false);
    clockStarts(0.2);
    await Promise.resolve();
    expect(ready).toBe(true);

    let late = false;
    tone.suspend();
    tone.unlock();
    FakeContext.last.state = 'suspended';
    void tone.whenReady().then(() => (late = true));
    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(late).toBe(true);
  });
});

describe('the tone, when the audio may not start yet', () => {
  it('tries again on every gesture, and waits for the clock after resuming', () => {
    // A touch's pointerdown is not yet a gesture that may start the audio.
    FakeContext.initialState = 'suspended';
    FakeContext.allowStart = false;
    tone.unlock();
    tone.start();
    vi.advanceTimersByTime(60);
    tone.stop();
    tone.unlock();
    expect(scheduled()).toEqual([]);
    // The pointerup is.
    FakeContext.allowStart = true;
    tone.unlock();
    expect(FakeContext.last.resumes).toBe(3);
    expect(FakeContext.last.state).toBe('running');
    clockStarts(0.25);
    expect(scheduled()).toEqual([
      ['set', 0, 255],
      ['ramp', 1, 260],
      ['set', 1, 315],
      ['ramp', 0, 320],
    ]);
  });

  it('after being suspended, waits for the clock to move again', () => {
    tone.unlock();
    FakeContext.last.currentTime = 5;
    tone.suspend();
    tone.unlock();
    tone.beep(0, 50);
    expect(scheduled()).toEqual([]);
    clockStarts(5.1);
    expect(scheduled()[0]).toEqual(['set', 0, 5105]);
  });
});
