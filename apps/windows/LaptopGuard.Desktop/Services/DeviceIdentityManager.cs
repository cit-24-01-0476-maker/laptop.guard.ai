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
        public string CloudUrl { get; set; } = "https://laptopguard-api.onrender.com";
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

            if (string.IsNullOrEmpty(cloudUrl) || cloudUrl.Contains("laptop-guard-ai.onrender.com"))
            {
                cloudUrl = "https://laptopguard-api.onrender.com";
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

        public class ServerPairingResult
        {
            public string PairingRequestId { get; set; } = string.Empty;
            public string PairingCode { get; set; } = string.Empty;
            public string TargetEmail { get; set; } = string.Empty;
            public string QrPayload { get; set; } = string.Empty;
            public int ExpiresInSeconds { get; set; } = 300;
        }

        public async Task<ServerPairingResult?> RequestServerPairingCodeAsync(string? targetEmail = null)
        {
            var identity = await GetOrCreateIdentityAsync();
            using var client = new System.Net.Http.HttpClient();
            client.Timeout = TimeSpan.FromSeconds(25);

            string baseUrl = string.IsNullOrEmpty(identity.CloudUrl) ? "https://laptopguard-api.onrender.com" : identity.CloudUrl;

            var payload = new
            {
                device_id = identity.DeviceId,
                device_name = identity.DeviceName,
                device_public_key = "ed25519_pk_" + identity.DeviceId,
                target_email = string.IsNullOrWhiteSpace(targetEmail) ? null : targetEmail.Trim().ToLowerInvariant(),
                manufacturer = "Dell Inc.",
                model = "G15 5530",
                os_version = "Windows 11",
                agent_version = "2.0.0"
            };

            var content = new System.Net.Http.StringContent(
                JsonSerializer.Serialize(payload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            try
            {
                var resp = await client.PostAsync($"{baseUrl.TrimEnd('/')}/api/v1/pairing/request", content);
                if (!resp.IsSuccessStatusCode) return null;

                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var result = new ServerPairingResult
                {
                    PairingRequestId = root.GetProperty("pairing_request_id").GetString() ?? "",
                    PairingCode = root.GetProperty("pairing_code").GetString() ?? "",
                    TargetEmail = targetEmail ?? "",
                    QrPayload = root.GetProperty("qr_payload").GetString() ?? "",
                    ExpiresInSeconds = root.GetProperty("expires_in_seconds").GetInt32()
                };

                // Dual-sync to local backend if running
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var localClient = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(2) };
                        var localPayload = new
                        {
                            device_id = identity.DeviceId,
                            device_name = identity.DeviceName,
                            device_public_key = "ed25519_pk_" + identity.DeviceId,
                            target_email = string.IsNullOrWhiteSpace(targetEmail) ? null : targetEmail.Trim().ToLowerInvariant(),
                            pairing_code = result.PairingCode,
                            pairing_request_id = result.PairingRequestId,
                            manufacturer = "Dell Inc.",
                            model = "G15 5530",
                            os_version = "Windows 11",
                            agent_version = "2.0.0"
                        };
                        var localContent = new System.Net.Http.StringContent(
                            JsonSerializer.Serialize(localPayload),
                            System.Text.Encoding.UTF8,
                            "application/json"
                        );
                        await localClient.PostAsync("http://127.0.0.1:8000/api/v1/pairing/request", localContent);
                    }
                    catch { }
                });

                return result;
            }
            catch
            {
                return null;
            }
        }

        public async Task<(string status, string? claimedBy)> CheckPairingStatusAsync(string requestId)
        {
            var identity = await GetOrCreateIdentityAsync();
            using var client = new System.Net.Http.HttpClient();
            client.Timeout = TimeSpan.FromSeconds(6);

            string baseUrl = string.IsNullOrEmpty(identity.CloudUrl) ? "https://laptopguard-api.onrender.com" : identity.CloudUrl;

            try
            {
                var resp = await client.GetAsync($"{baseUrl.TrimEnd('/')}/api/v1/pairing/status/{requestId}");
                if (resp.IsSuccessStatusCode)
                {
                    var json = await resp.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;
                    string st = root.GetProperty("status").GetString() ?? "PENDING";
                    string? email = root.TryGetProperty("claimed_by_email", out var e) ? e.GetString() : null;
                    if (st == "CLAIMED" || st == "CONSUMED")
                    {
                        return (st, email);
                    }
                }

                // Fallback check on local if cloud returned PENDING or failed
                try
                {
                    using var locClient = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(1.5) };
                    var locResp = await locClient.GetAsync($"http://127.0.0.1:8000/api/v1/pairing/status/{requestId}");
                    if (locResp.IsSuccessStatusCode)
                    {
                        var locJson = await locResp.Content.ReadAsStringAsync();
                        using var locDoc = JsonDocument.Parse(locJson);
                        var locRoot = locDoc.RootElement;
                        string locSt = locRoot.GetProperty("status").GetString() ?? "PENDING";
                        string? locEmail = locRoot.TryGetProperty("claimed_by_email", out var le) ? le.GetString() : null;
                        if (locSt == "CLAIMED" || locSt == "CONSUMED")
                        {
                            return (locSt, locEmail);
                        }
                    }
                }
                catch { }

                return ("PENDING", null);
            }
            catch
            {
                return ("ERROR", null);
            }
        }

        public async Task<bool> ConfirmPairingAsync(string requestId)
        {
            var identity = await GetOrCreateIdentityAsync();
            using var client = new System.Net.Http.HttpClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            string baseUrl = string.IsNullOrEmpty(identity.CloudUrl) ? "https://laptopguard-api.onrender.com" : identity.CloudUrl;

            try
            {
                var payload = new
                {
                    pairing_request_id = requestId,
                    device_id = identity.DeviceId,
                    approved = true
                };

                var content = new System.Net.Http.StringContent(
                    JsonSerializer.Serialize(payload),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var resp = await client.PostAsync($"{baseUrl.TrimEnd('/')}/api/v1/pairing/confirm", content);
                bool cloudSuccess = resp.IsSuccessStatusCode;

                // Also confirm locally if running
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var locClient = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(2) };
                        var locContent = new System.Net.Http.StringContent(
                            JsonSerializer.Serialize(payload),
                            System.Text.Encoding.UTF8,
                            "application/json"
                        );
                        await locClient.PostAsync("http://127.0.0.1:8000/api/v1/pairing/confirm", locContent);
                    }
                    catch { }
                });

                return cloudSuccess;
            }
            catch
            {
                return false;
            }
        }
    }
}
