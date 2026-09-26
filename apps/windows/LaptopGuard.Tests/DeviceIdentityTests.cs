using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using LaptopGuard.Core.Storage;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Tests
{
    public class DeviceIdentityTests : IDisposable
    {
        private readonly string _testDbPath;
        private readonly LocalDurableStore _store;
        private readonly DeviceIdentityManager _manager;

        public DeviceIdentityTests()
        {
            _testDbPath = Path.Combine(Path.GetTempPath(), $"sentinel_identity_test_{Guid.NewGuid():N}.db");
            _store = new LocalDurableStore(_testDbPath);
            _manager = new DeviceIdentityManager(_store);
        }

        [Fact]
        public async Task Identity_DefaultCreation_ConfiguresDefaultPin6728()
        {
            var identity = await _manager.GetOrCreateIdentityAsync();

            Assert.NotNull(identity);
            Assert.StartsWith("dev_", identity.DeviceId);
            Assert.NotEmpty(identity.DeviceName);
            Assert.NotEmpty(identity.MasterPinHash);

            // Default PIN 6728 must verify
            bool validDefault = await _manager.VerifyPinAsync("6728");
            Assert.True(validDefault);

            // Wrong PIN must be rejected
            bool invalid = await _manager.VerifyPinAsync("0000");
            Assert.False(invalid);
        }

        [Fact]
        public async Task SetMasterPin_UpdatesPinAndRejectsOldPin()
        {
            await _manager.GetOrCreateIdentityAsync();

            // Change to 9482
            await _manager.SetMasterPinAsync("9482");

            bool newValid = await _manager.VerifyPinAsync("9482");
            Assert.True(newValid);

            bool oldInvalid = await _manager.VerifyPinAsync("6728");
            Assert.False(oldInvalid);
        }

        [Fact]
        public async Task GeneratePairingJson_CreatesValidPayload()
        {
            string json = await _manager.GeneratePairingJsonAsync();
            Assert.NotEmpty(json);

            var payload = JsonSerializer.Deserialize<PairingPayload>(json);
            Assert.NotNull(payload);
            Assert.NotEmpty(payload.DeviceId);
            Assert.NotEmpty(payload.PairingToken);
            Assert.Equal(300, payload.ExpiresInSeconds);
        }

        [Fact]
        public void QrCodeService_GeneratesValidBitmap()
        {
            // STA thread required for WPF BitmapImage operations
            var staThread = new Thread(() =>
            {
                var bmp = QrCodeService.GenerateQrCodeImage("test_pairing_payload_string");
                Assert.NotNull(bmp);
                Assert.True(bmp.PixelWidth > 0);
                Assert.True(bmp.PixelHeight > 0);
                Assert.True(bmp.IsFrozen);
            });
            staThread.SetApartmentState(ApartmentState.STA);
            staThread.Start();
            staThread.Join(5000);
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
