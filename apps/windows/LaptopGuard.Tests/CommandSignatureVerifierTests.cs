using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Xunit;
using LaptopGuard.Core.Cloud;

namespace LaptopGuard.Tests
{
    public class CommandSignatureVerifierTests
    {
        private readonly CommandSignatureVerifier _verifier = new();
        private static readonly byte[] SecretKey = Encoding.UTF8.GetBytes("laptopguard_device_secret_2026_super_secure_key");

        private CommandEnvelope CreateValidEnvelope(
            string cmdType = "LOCK_DEVICE",
            string deviceId = "test_dev_01",
            string userId = "test_user_01",
            long? expiresAt = null,
            string? customNonce = null,
            object? payloadObj = null)
        {
            string cmdId = $"cmd_{Guid.NewGuid():N}";
            string nonce = customNonce ?? Guid.NewGuid().ToString("N");
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            long exp = expiresAt ?? (now + 300);

            string payloadJson = "{}";
            JsonElement? payloadEl = null;

            if (payloadObj != null)
            {
                payloadJson = JsonSerializer.Serialize(payloadObj);
                using var doc = JsonDocument.Parse(payloadJson);
                payloadEl = doc.RootElement.Clone();
            }

            string dataToSign = $"{cmdId}:{cmdType}:{deviceId}:{userId}:{nonce}:{exp}:{payloadJson}";

            using var hmac = new HMACSHA256(SecretKey);
            string sig = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign))).ToLowerInvariant();

            return new CommandEnvelope
            {
                CommandId = cmdId,
                CommandType = cmdType,
                DeviceId = deviceId,
                UserId = userId,
                Nonce = nonce,
                CreatedAt = now,
                ExpiresAt = exp,
                Payload = payloadEl,
                Signature = sig
            };
        }

        [Fact]
        public void ValidEnvelope_PassesVerification()
        {
            var envelope = CreateValidEnvelope();
            var (isValid, reason) = _verifier.Verify(envelope);

            Assert.True(isValid);
            Assert.Equal("Valid", reason);
        }

        [Fact]
        public void TamperedCommandType_FailsVerification()
        {
            var envelope = CreateValidEnvelope(cmdType: "LOCK_DEVICE");
            envelope.CommandType = "DISARM_DEVICE"; // Tampered!

            var (isValid, reason) = _verifier.Verify(envelope);

            Assert.False(isValid);
            Assert.Equal("Cryptographic signature mismatch", reason);
        }

        [Fact]
        public void ExpiredCommand_FailsVerification()
        {
            long pastTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 400; // Expired > 300s ago
            var envelope = CreateValidEnvelope(expiresAt: pastTime);

            var (isValid, reason) = _verifier.Verify(envelope);

            Assert.False(isValid);
            Assert.Equal("Command has expired", reason);
        }

        [Fact]
        public void ReplayedNonce_FailsVerification()
        {
            string reusedNonce = $"reused_nonce_{Guid.NewGuid():N}";
            var envelope1 = CreateValidEnvelope(customNonce: reusedNonce);
            var envelope2 = CreateValidEnvelope(customNonce: reusedNonce);

            var (firstValid, _) = _verifier.Verify(envelope1);
            Assert.True(firstValid);

            // Replay attack with same nonce
            var (secondValid, reason) = _verifier.Verify(envelope2);
            Assert.False(secondValid);
            Assert.Equal("Replay attack detected: Nonce has already been used", reason);
        }
    }
}
