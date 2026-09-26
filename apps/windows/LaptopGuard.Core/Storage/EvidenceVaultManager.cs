using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using LaptopGuard.Core.Security;

namespace LaptopGuard.Core.Storage
{
    public class EvidenceVaultManager
    {
        private readonly string _vaultPath;
        private readonly byte[] _vaultKey;

        public string VaultPath => _vaultPath;

        public EvidenceVaultManager(string? customVaultPath = null)
        {
            if (string.IsNullOrEmpty(customVaultPath))
            {
                _vaultPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "LaptopGuard",
                    "EvidenceVault"
                );
            }
            else
            {
                _vaultPath = customVaultPath;
            }
            Directory.CreateDirectory(_vaultPath);

            // Vault Master Key: 256-bit key protected with DPAPI
            string keyPath = Path.Combine(_vaultPath, ".vault_key.enc");
            if (File.Exists(keyPath))
            {
                string encKey = File.ReadAllText(keyPath);
                string plainHex = DpapiVault.Unprotect(encKey);
                _vaultKey = Convert.FromHexString(plainHex);
            }
            else
            {
                _vaultKey = RandomNumberGenerator.GetBytes(32); // 256-bit key
                string encKey = DpapiVault.Protect(Convert.ToHexString(_vaultKey));
                File.WriteAllText(keyPath, encKey);
            }
        }

        public byte[] EncryptEvidence(byte[] plainBytes)
        {
            byte[] nonce = RandomNumberGenerator.GetBytes(12); // 96-bit nonce for GCM
            byte[] ciphertext = new byte[plainBytes.Length];
            byte[] tag = new byte[16]; // 128-bit authentication tag

            using var aes = new AesGcm(_vaultKey, 16);
            aes.Encrypt(nonce, plainBytes, ciphertext, tag);

            // Combined format: [12 bytes nonce] + [16 bytes tag] + [N bytes ciphertext]
            byte[] combined = new byte[12 + 16 + ciphertext.Length];
            Buffer.BlockCopy(nonce, 0, combined, 0, 12);
            Buffer.BlockCopy(tag, 0, combined, 12, 16);
            Buffer.BlockCopy(ciphertext, 0, combined, 28, ciphertext.Length);

            return combined;
        }

        public byte[] DecryptEvidence(byte[] encryptedBytes)
        {
            if (encryptedBytes.Length < 28)
            {
                throw new ArgumentException("Encrypted payload is too short to be valid AES-GCM data.");
            }

            byte[] nonce = new byte[12];
            byte[] tag = new byte[16];
            int cipherLen = encryptedBytes.Length - 28;
            byte[] ciphertext = new byte[cipherLen];

            Buffer.BlockCopy(encryptedBytes, 0, nonce, 0, 12);
            Buffer.BlockCopy(encryptedBytes, 12, tag, 0, 16);
            Buffer.BlockCopy(encryptedBytes, 28, ciphertext, 0, cipherLen);

            byte[] plainBytes = new byte[cipherLen];
            using var aes = new AesGcm(_vaultKey, 16);
            aes.Decrypt(nonce, ciphertext, tag, plainBytes);

            return plainBytes;
        }

        public async Task<string> SaveEncryptedSnapshotAsync(byte[] imageBytes, string deviceId, string triggerEvent)
        {
            string fileId = $"evi_{Guid.NewGuid().ToString("N")[..12]}";
            string fileName = $"{fileId}_snapshot_{deviceId}.jpg.enc";
            string filePath = Path.Combine(_vaultPath, fileName);

            byte[] encrypted = EncryptEvidence(imageBytes);
            await File.WriteAllBytesAsync(filePath, encrypted);

            return filePath;
        }

        public async Task<bool> UploadEvidenceAsync(string cloudBaseUrl, string deviceId, string filePath, string triggerEvent)
        {
            if (!File.Exists(filePath)) return false;

            try
            {
                byte[] encBytes = await File.ReadAllBytesAsync(filePath);
                byte[] plainBytes = DecryptEvidence(encBytes);

                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                using var form = new MultipartFormDataContent();

                form.Add(new StringContent(deviceId), "device_id");
                form.Add(new StringContent("SNAPSHOT"), "file_type");
                form.Add(new StringContent(triggerEvent), "trigger_event");
                form.Add(new StringContent("7"), "retention_days");

                string originalName = Path.GetFileName(filePath).Replace(".enc", "");
                var fileContent = new ByteArrayContent(plainBytes);
                fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
                form.Add(fileContent, "file", originalName);

                string uploadUrl = $"{cloudBaseUrl.TrimEnd('/')}/api/evidence/upload";
                var response = await httpClient.PostAsync(uploadUrl, form);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EVIDENCE UPLOAD ERROR] {ex.Message}");
                return false;
            }
        }
    }
}
