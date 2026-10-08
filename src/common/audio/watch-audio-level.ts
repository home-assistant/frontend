/**
 * Measures the volume of an audio track with the Web Audio API.
 *
 * Calls `onLevel` with a level between 0 and 1, rounded to steps of 0.05 and
 * only when it changed, so silence does not cause work every frame.
 * Returns a function that stops measuring and releases the audio context.
 */
export const watchAudioLevel = (
  track: MediaStreamTrack,
  onLevel: (level: number) => void
): (() => void) => {
  const context = new AudioContext();
  // Browsers can start an audio context suspended when it is not created in a
  // click handler, like here. Resume without waiting: until it runs the level
  // is 0, and resume() can stay pending in browsers that need a new click.
  context.resume().catch(() => undefined);
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(new MediaStream([track])).connect(analyser);

  const samples = new Float32Array(analyser.fftSize);
  let level = 0;
  let reported = -1;
  let frame = 0;

  const tick = () => {
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      sum += sample * sample;
    }
    // Root mean square is the loudness, in decibels it matches what we hear
    const decibels = 20 * Math.log10(Math.sqrt(sum / samples.length));
    // Map silence (-60 dB) to 0 and loud speech (-10 dB) to 1
    const current = Math.min(1, Math.max(0, (decibels + 60) / 50));
    // Rise immediately but fall slowly (about a second), so it fades out
    level = Math.max(current, level * 0.95);
    const rounded = Math.round(level * 20) / 20;
    if (rounded !== reported) {
      reported = rounded;
      onLevel(rounded);
    }
    frame = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(frame);
    context.close();
  };
};
