using System;
using System.IO;
using System.Threading.Tasks;
using Xunit;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Storage;

namespace LaptopGuard.Tests
{
    public class DurableStoreTests : IDisposable
    {
        private readonly string _testDbPath;
        private readonly LocalDurableStore _store;

        public DurableStoreTests()
        {
            _testDbPath = Path.Combine(Path.GetTempPath(), $"sentinel_test_{Guid.NewGuid():N}.db");
            _store = new LocalDurableStore(_testDbPath);
        }

        [Fact]
        public async Task SaveIncident_PersistsAndCanBeRetrieved()
        {
            await _store.InitializeAsync();

            var incident = new SecurityIncident
            {
                DeviceId = "test_laptop",
                EventType = "POWER_DISCONNECT",
                Severity = IncidentSeverity.Critical,
                Title = "AC Disconnected",
                Description = "Power cable was pulled",
                DetailsJson = "{\"charger\": false}"
            };

            await _store.SaveIncidentAsync(incident);

            var pending = await _store.GetPendingIncidentsAsync();
            Assert.NotEmpty(pending);
            Assert.Contains(pending, i => i.Id == incident.Id);

            var retrieved = pending.Find(i => i.Id == incident.Id);
            Assert.NotNull(retrieved);
            Assert.Equal("POWER_DISCONNECT", retrieved.EventType);
            Assert.False(retrieved.SyncedToCloud);

            await _store.MarkIncidentSyncedAsync(incident.Id);

            var updatedPending = await _store.GetPendingIncidentsAsync();
            Assert.DoesNotContain(updatedPending, i => i.Id == incident.Id);
        }

        [Fact]
        public async Task ConfigStorage_StoresAndRetrievesEncryptedValue()
        {
            await _store.InitializeAsync();

            string secretToken = "jwt_super_secret_token_12345";
            await _store.SetConfigAsync("CloudToken", secretToken);

            string? retrieved = await _store.GetConfigAsync("CloudToken");
            Assert.Equal(secretToken, retrieved);
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
