using System;
using System.IO;
using System.Media;
using System.Threading;
using System.Threading.Tasks;

namespace LaptopGuard.SessionAgent.Audio
{
    public class AlarmSirenPlayer : IDisposable
    {
        private SoundPlayer? _player;
        private MemoryStream? _sirenStream;
        private readonly object _lock = new();
        private bool _isPlaying = false;
        private CancellationTokenSource? _beepCts;

        public bool IsPlaying
        {
            get { lock (_lock) return _isPlaying; }
        }

        public void PlaySiren(string? customWavPath = null, int volumePercent = 40)
        {
            lock (_lock)
            {
                if (_isPlaying) return;
                _isPlaying = true;

                try
                {
                    if (!string.IsNullOrEmpty(customWavPath) && File.Exists(customWavPath))
                    {
                        _player = new SoundPlayer(customWavPath);
                        _player.PlayLooping();
                        Console.WriteLine($"[AUDIO] Playing custom siren audio in loop at volume {volumePercent}%.");
                        return;
                    }

                    // Fallback to embedded synthesized alternating siren WAV with user-configured volume (default 40%)
                    _sirenStream = GenerateSirenWavStream(durationSeconds: 3, volumePercent: volumePercent);
                    _player = new SoundPlayer(_sirenStream);
                    _player.PlayLooping();
                    Console.WriteLine($"[AUDIO] Playing synthesized emergency siren in loop at {volumePercent}% volume.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AUDIO WARNING] SoundPlayer exception: {ex.Message}. Falling back to console beeper.");
                    StartConsoleBeepFallback();
                }
            }
        }

        public void StopSiren()
        {
            lock (_lock)
            {
                if (!_isPlaying) return;
                _isPlaying = false;

                try
                {
                    _player?.Stop();
                    _player?.Dispose();
                    _player = null;

                    _sirenStream?.Dispose();
                    _sirenStream = null;

                    _beepCts?.Cancel();
                    _beepCts?.Dispose();
                    _beepCts = null;

                    Console.WriteLine("[AUDIO] Siren stopped.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AUDIO ERROR] Error stopping siren: {ex.Message}");
                }
            }
        }

        private void StartConsoleBeepFallback()
        {
            _beepCts?.Cancel();
            _beepCts = new CancellationTokenSource();
            var token = _beepCts.Token;

            _ = Task.Run(() =>
            {
                while (!token.IsCancellationRequested)
                {
                    try
                    {
                        Console.Beep(900, 200);
                        Console.Beep(1400, 200);
                    }
                    catch
                    {
                        Thread.Sleep(400);
                    }
                }
            }, token);
        }

        /// <summary>
        /// Generates a valid in-memory PCM 16-bit 44.1kHz WAV stream with alternating two-tone siren.
        /// Zero external dependencies required.
        /// </summary>
        private static MemoryStream GenerateSirenWavStream(int durationSeconds = 3, int volumePercent = 40)
        {
            int sampleRate = 44100;
            short bitsPerSample = 16;
            short channels = 1;
            int totalSamples = sampleRate * durationSeconds;
            int dataLength = totalSamples * (bitsPerSample / 8);

            var ms = new MemoryStream();
            using var writer = new BinaryWriter(ms, System.Text.Encoding.UTF8, leaveOpen: true);

            // RIFF header
            writer.Write("RIFF"u8.ToArray());
            writer.Write(36 + dataLength);
            writer.Write("WAVE"u8.ToArray());

            // fmt sub-chunk
            writer.Write("fmt "u8.ToArray());
            writer.Write(16); // Subchunk1Size
            writer.Write((short)1); // AudioFormat: PCM
            writer.Write(channels);
            writer.Write(sampleRate);
            writer.Write(sampleRate * channels * (bitsPerSample / 8)); // ByteRate
            writer.Write((short)(channels * (bitsPerSample / 8)));     // BlockAlign
            writer.Write(bitsPerSample);

            // data sub-chunk
            writer.Write("data"u8.ToArray());
            writer.Write(dataLength);

            // Calculate scaled amplitude from user volume (default 40%, capped between 5% and 100%)
            double amplitude = (Math.Clamp(volumePercent, 5, 100) / 100.0) * 30000.0;

            // Siren frequencies: sweep between 750 Hz and 1350 Hz
            for (int i = 0; i < totalSamples; i++)
            {
                double t = (double)i / sampleRate;
                // Modulation frequency: 2 sweeps per second
                double mod = Math.Sin(2.0 * Math.PI * 2.0 * t);
                double freq = 1050.0 + (300.0 * mod);
                double angle = 2.0 * Math.PI * freq * t;
                short sample = (short)(Math.Sin(angle) * amplitude);
                writer.Write(sample);
            }

            writer.Flush();
            ms.Position = 0;
            return ms;
        }

        public void Dispose()
        {
            StopSiren();
        }
    }
}
