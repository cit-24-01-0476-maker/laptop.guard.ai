using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using LaptopGuard.Core.Storage;

namespace LaptopGuard.Tests
{
    public class EvidenceVaultTests : IDisposable
    {
        private readonly string _testVaultDir;
        private readonly EvidenceVaultManager _vault;

        public EvidenceVaultTests()
        {
            _testVaultDir = Path.Combine(Path.GetTempPath(), $"evidence_vault_test_{Guid.NewGuid():N}");
            _vault = new EvidenceVaultManager(_testVaultDir);
        }

        [Fact]
        public void EncryptAndDecrypt_RoundtripsOriginalBytesAccurately()
        {
            byte[] originalBytes = Encoding.UTF8.GetBytes("High-resolution security evidence snapshot payload 2026.");

            byte[] encrypted = _vault.EncryptEvidence(originalBytes);
            Assert.NotEqual(originalBytes, encrypted);
            Assert.True(encrypted.Length >= originalBytes.Length + 28); // 12 bytes nonce + 16 bytes tag + data

            byte[] decrypted = _vault.DecryptEvidence(encrypted);
            Assert.Equal(originalBytes, decrypted);
        }

        [Fact]
        public void TamperedCiphertext_FailsAuthenticationTagVerification()
        {
            byte[] originalBytes = Encoding.UTF8.GetBytes("Critical security evidence.");
            byte[] encrypted = _vault.EncryptEvidence(originalBytes);

            // Tamper with the ciphertext (byte 29)
            encrypted[29] ^= 0xFF;

            Assert.Throws<AuthenticationTagMismatchException>(() =>
            {
                _vault.DecryptEvidence(encrypted);
            });
        }

        [Fact]
        public async Task SaveEncryptedSnapshot_WritesFileToDiskAndCanBeDecrypted()
        {
            byte[] testImageBytes = new byte[1024];
            Random.Shared.NextBytes(testImageBytes);

            string savedPath = await _vault.SaveEncryptedSnapshotAsync(testImageBytes, "dev_test_laptop", "AC_POWER_DISCONNECT");

            Assert.True(File.Exists(savedPath));
            Assert.EndsWith(".enc", savedPath);

            byte[] fileOnDisk = await File.ReadAllBytesAsync(savedPath);
            byte[] decrypted = _vault.DecryptEvidence(fileOnDisk);

            Assert.Equal(testImageBytes, decrypted);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testVaultDir))
                {
                    Directory.Delete(_testVaultDir, true);
                }
            }
            catch { }
        }
    }
}
