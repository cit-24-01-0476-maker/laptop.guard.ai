using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.State;
using LaptopGuard.Core.Storage;

namespace LaptopGuard.Tests
{
    public class Milestone1LatencyTests : IDisposable
    {
        private readonly ITestOutputHelper _output;
        private readonly string _testDbPath;
        private readonly LocalDurableStore _store;

        public Milestone1LatencyTests(ITestOutputHelper output)
        {
            _output = output;
            _testDbPath = Path.Combine(Path.GetTempPath(), $"sentinel_latency_{Guid.NewGuid():N}.db");
            _store = new LocalDurableStore(_testDbPath);
        }

        [Fact]
        public async Task PowerDisconnectWhileArmed_ExecutesUnder500msP95()
        {
            await _store.InitializeAsync();

            const int iterations = 50;
            var latencies = new List<double>();

            for (int i = 0; i < iterations; i++)
            {
                using var fsm = new SecurityStateMachine { DeviceId = "test_sentinel_rig" };
                fsm.Arm(graceSeconds: 0);
                Assert.Equal(DeviceSecurityState.Armed, fsm.CurrentState);

                // High-resolution timing
                long startTicks = Stopwatch.GetTimestamp();

                // 1. Hardware event detection & state evaluation
                var incident = fsm.EvaluatePowerEvent(PowerSource.Battery, "AC power disconnect detected via hardware interrupt");
                Assert.NotNull(incident);
                Assert.Equal(DeviceSecurityState.Triggered, fsm.CurrentState);

                // 2. Synchronous write to durable SQLite store (WAL mode)
                await _store.SaveIncidentAsync(incident);

                // 3. Serialization for IPC dispatch to SessionAgent
                var ipcMsg = IpcMessage.CreateIncident(incident);
                string json = JsonSerializer.Serialize(ipcMsg);
                Assert.NotEmpty(json);

                long endTicks = Stopwatch.GetTimestamp();
                double elapsedMs = (endTicks - startTicks) * 1000.0 / Stopwatch.Frequency;
                latencies.Add(elapsedMs);
            }

            latencies.Sort();
            double p50 = latencies[(int)(iterations * 0.50)];
            double p95 = latencies[(int)(iterations * 0.95)];
            double p99 = latencies[(int)(iterations * 0.99)];
            double avg = latencies.Average();

            _output.WriteLine($"=== MILESTONE 1 BENCHMARK RESULTS ({iterations} Iterations) ===");
            _output.WriteLine($"Average Response Time : {avg:F3} ms");
            _output.WriteLine($"p50 (Median)          : {p50:F3} ms");
            _output.WriteLine($"p95 Latency           : {p95:F3} ms");
            _output.WriteLine($"p99 Latency           : {p99:F3} ms");
            _output.WriteLine($"Target Threshold      : <= 500.0 ms");

            // Assert Milestone 1 Acceptance Criteria: p95 <= 500ms
            Assert.True(p95 <= 500.0, $"Milestone 1 p95 latency ({p95:F2}ms) exceeded 500ms target!");
        }

        public void Dispose()
        {
            _store.Dispose();
            try
            {
                if (File.Exists(_testDbPath)) File.Delete(_testDbPath);
                string wal = _testDbPath + "-wal";
                string shm = _testDbPath + "-shm";
                if (File.Exists(wal)) File.Delete(wal);
                if (File.Exists(shm)) File.Delete(shm);
            }
            catch { }
        }
    }
}
