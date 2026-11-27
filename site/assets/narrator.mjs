// Only one segment is in flight. Wait for playback before advancing the view.
export async function narrate({sample, write, show, speak, caption, retrying, wait = delay}, signal) {
  let index = 0, previous = '', failures = 0;
  while (!signal.aborted) {
    try {
      const context = sample(index, previous);
      const segment = await write(context, AbortSignal.any([signal, AbortSignal.timeout(90000)]));
      signal.throwIfAborted();
      if (!show(segment.target)) throw Error('Scene unavailable');
      caption(segment.text);
      await speak(segment.text, context.language, signal);
      previous = segment.text;
      index++;
      failures = 0;
      await wait(3000, signal);
    } catch (error) {
      if (signal.aborted) return;
      if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError' || /\b(401|403)\b/.test(error.message)) throw error;
      failures++;
      retrying(error);
      await wait(Math.min(60000, 3000 * 2 ** Math.min(5, failures - 1)), signal);
    }
  }
}

function delay(ms, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, {once:true});
  });
}

export async function speakSegment(text, language, signal) {
  // Short utterances avoid platform limits on continuous synthesized speech.
  for (const phrase of text.match(/[^。！？.!?\n]{1,140}[。！？.!?]*|[。！？.!?]+/gu) || []) {
    signal.throwIfAborted();
    await new Promise((resolve, reject) => {
      const speech = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = language;
      const finish = error => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        utterance.onend = utterance.onerror = null;
        if (error) { speech.cancel(); reject(error); } else resolve();
      };
      const abort = () => finish(signal.reason);
      const timer = setTimeout(() => finish(Error('Speech timed out')), 55000);
      utterance.onend = () => finish();
      utterance.onerror = event => finish(new DOMException(event.error,
        event.error === 'not-allowed' ? 'NotAllowedError' : 'NotSupportedError'));
      signal.addEventListener('abort', abort, {once:true});
      speech.speak(utterance);
    });
  }
}
