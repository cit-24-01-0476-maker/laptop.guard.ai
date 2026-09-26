using System;
using System.Text.Json;
using System.Threading.Tasks;
using LaptopGuard.Core.Security;
using LaptopGuard.Core.Storage;

namespace LaptopGuard.Desktop.Services
{
    public class DeviceIdentity
    {
        public string DeviceId { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
        public string CloudUrl { get; set; } = "https://laptop-guard-ai.onrender.com";
        public string MasterPinSalt { get; set; } = string.Empty;
        public string MasterPinHash { get; set; } = string.Empty;
    }

    public class PairingPayload
    {
        [System.Text.Json.Serialization.JsonPropertyName("device_id")]
        public string DeviceId { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("device_name")]
        public string DeviceName { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("pairing_token")]
        public string PairingToken { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("cloud_url")]
        public string CloudUrl { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("generated_at")]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        [System.Text.Json.Serialization.JsonPropertyName("expires_in_seconds")]
        public int ExpiresInSeconds { get; set; } = 300;
    }

    public class DeviceIdentityManager
    {
        private readonly LocalDurableStore _store;
        private DeviceIdentity? _identity;

        public DeviceIdentityManager(LocalDurableStore store)
        {
            _store = store;
        }

        public async Task<DeviceIdentity> GetOrCreateIdentityAsync()
        {
            if (_identity != null) return _identity;

            await _store.InitializeAsync();
            string? deviceId = await _store.GetConfigAsync("DeviceId");
            string? deviceName = await _store.GetConfigAsync("DeviceName");
            string? salt = await _store.GetConfigAsync("MasterPinSalt");
            string? hash = await _store.GetConfigAsync("MasterPinHash");
            string? cloudUrl = await _store.GetConfigAsync("CloudUrl");

            if (string.IsNullOrEmpty(deviceId))
            {
                string cleanName = Environment.MachineName.ToLowerInvariant().Replace(" ", "_");
                deviceId = $"dev_{cleanName}_{Guid.NewGuid().ToString("N")[..6]}";
                await _store.SetConfigAsync("DeviceId", deviceId);
            }

            if (string.IsNullOrEmpty(deviceName))
            {
                deviceName = Environment.MachineName;
                await _store.SetConfigAsync("DeviceName", deviceName);
            }

            if (string.IsNullOrEmpty(salt) || string.IsNullOrEmpty(hash))
            {
                // Default Master PIN is 6728
                salt = Guid.NewGuid().ToString("N");
                hash = DpapiVault.HashPin("6728", salt);
                await _store.SetConfigAsync("MasterPinSalt", salt);
                await _store.SetConfigAsync("MasterPinHash", hash);
            }

            if (string.IsNullOrEmpty(cloudUrl))
            {
                cloudUrl = "https://laptop-guard-ai.onrender.com";
                await _store.SetConfigAsync("CloudUrl", cloudUrl);
            }

            _identity = new DeviceIdentity
            {
                DeviceId = deviceId,
                DeviceName = deviceName,
                CloudUrl = cloudUrl,
                MasterPinSalt = salt,
                MasterPinHash = hash
            };

            return _identity;
        }

        public async Task<bool> VerifyPinAsync(string inputPin)
        {
            var identity = await GetOrCreateIdentityAsync();
            return DpapiVault.VerifyPin(inputPin, identity.MasterPinSalt, identity.MasterPinHash);
        }

        public async Task SetMasterPinAsync(string newPin)
        {
            var identity = await GetOrCreateIdentityAsync();
            string newSalt = Guid.NewGuid().ToString("N");
            string newHash = DpapiVault.HashPin(newPin, newSalt);

            await _store.SetConfigAsync("MasterPinSalt", newSalt);
            await _store.SetConfigAsync("MasterPinHash", newHash);

            identity.MasterPinSalt = newSalt;
            identity.MasterPinHash = newHash;
        }

        public async Task<string> GeneratePairingJsonAsync()
        {
            var identity = await GetOrCreateIdentityAsync();
            string pairingToken = Guid.NewGuid().ToString("N");
            await _store.SetConfigAsync("LatestPairingToken", pairingToken);

            var payload = new PairingPayload
            {
                DeviceId = identity.DeviceId,
                DeviceName = identity.DeviceName,
                PairingToken = pairingToken,
                CloudUrl = identity.CloudUrl,
                GeneratedAt = DateTime.UtcNow,
                ExpiresInSeconds = 300
            };

            return JsonSerializer.Serialize(payload);
        }
    }
}
