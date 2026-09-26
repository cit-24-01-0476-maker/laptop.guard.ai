using System;
using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LaptopGuard.Core.Cloud
{
    public class CommandEnvelope
    {
        [JsonPropertyName("command_id")]
        public string CommandId { get; set; } = string.Empty;

        [JsonPropertyName("command_type")]
        public string CommandType { get; set; } = string.Empty;

        [JsonPropertyName("device_id")]
        public string DeviceId { get; set; } = string.Empty;

        [JsonPropertyName("user_id")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("nonce")]
        public string Nonce { get; set; } = string.Empty;

        [JsonPropertyName("created_at")]
        public long CreatedAt { get; set; }

        [JsonPropertyName("expires_at")]
        public long ExpiresAt { get; set; }

        [JsonPropertyName("payload")]
        public JsonElement? Payload { get; set; }

        [JsonPropertyName("signature")]
        public string Signature { get; set; } = string.Empty;
    }

    public class CommandSignatureVerifier
    {
        private static readonly byte[] DefaultSecret = Encoding.UTF8.GetBytes("laptopguard_device_secret_2026_super_secure_key");
        private readonly ConcurrentDictionary<string, long> _seenNonces = new();

        public (bool IsValid, string Reason) Verify(CommandEnvelope envelope, byte[]? secretKey = null)
        {
            if (envelope == null) return (false, "Envelope is null");

            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // 1. Expiration Check (with 300s clock drift tolerance)
            if (envelope.ExpiresAt > 0 && envelope.ExpiresAt < (now - 300))
            {
                return (false, "Command has expired");
            }

            // 2. Nonce Replay Check
            if (string.IsNullOrEmpty(envelope.Nonce))
            {
                return (false, "Nonce is missing");
            }

            if (_seenNonces.ContainsKey(envelope.Nonce))
            {
                return (false, "Replay attack detected: Nonce has already been used");
            }

            // 3. Compute HMAC-SHA256 signature
            string payloadJson = "{}";
            if (envelope.Payload.HasValue && envelope.Payload.Value.ValueKind != JsonValueKind.Null && envelope.Payload.Value.ValueKind != JsonValueKind.Undefined)
            {
                payloadJson = envelope.Payload.Value.GetRawText();
            }

            // Backend format: f"{command_id}:{command_type}:{device_id}:{user_id}:{nonce}:{expires_at}:{json.dumps(payload, sort_keys=True)}"
            string dataToSign = $"{envelope.CommandId}:{envelope.CommandType}:{envelope.DeviceId}:{envelope.UserId}:{envelope.Nonce}:{envelope.ExpiresAt}:{payloadJson}";

            byte[] key = secretKey ?? DefaultSecret;
            using var hmac = new HMACSHA256(key);
            byte[] computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
            string calculatedSig = Convert.ToHexString(computedHash).ToLowerInvariant();

            // Constant-time compare
            byte[] expectedBytes = Encoding.UTF8.GetBytes(envelope.Signature.ToLowerInvariant());
            byte[] calculatedBytes = Encoding.UTF8.GetBytes(calculatedSig);

            if (expectedBytes.Length != calculatedBytes.Length || !CryptographicOperations.FixedTimeEquals(expectedBytes, calculatedBytes))
            {
                return (false, "Cryptographic signature mismatch");
            }

            // Mark nonce as seen
            _seenNonces[envelope.Nonce] = now;
            PruneOldNonces(now);

            return (true, "Valid");
        }

        private void PruneOldNonces(long now)
        {
            if (_seenNonces.Count > 1000)
            {
                foreach (var kvp in _seenNonces)
                {
                    if (kvp.Value < (now - 600))
                    {
                        _seenNonces.TryRemove(kvp.Key, out _);
                    }
                }
            }
        }
    }
}
