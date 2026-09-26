using System;
using System.Security.Cryptography;
using System.Text;

namespace LaptopGuard.Core.Security
{
    public static class DpapiVault
    {
        private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("LaptopGuard.AI.Sentinel.HardwareEntropy.2026");

        public static string Protect(string plainText, DataProtectionScope scope = DataProtectionScope.LocalMachine)
        {
            if (string.IsNullOrEmpty(plainText)) return string.Empty;
            try
            {
                byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
                byte[] cipherBytes = ProtectedData.Protect(plainBytes, Entropy, scope);
                return Convert.ToBase64String(cipherBytes);
            }
            catch
            {
                // Fallback to CurrentUser scope if LocalMachine requires elevated rights in user session
                if (scope == DataProtectionScope.LocalMachine)
                {
                    return Protect(plainText, DataProtectionScope.CurrentUser);
                }
                throw;
            }
        }

        public static string Unprotect(string cipherText, DataProtectionScope scope = DataProtectionScope.LocalMachine)
        {
            if (string.IsNullOrEmpty(cipherText)) return string.Empty;
            try
            {
                byte[] cipherBytes = Convert.FromBase64String(cipherText);
                byte[] plainBytes = ProtectedData.Unprotect(cipherBytes, Entropy, scope);
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch
            {
                if (scope == DataProtectionScope.LocalMachine)
                {
                    return Unprotect(cipherText, DataProtectionScope.CurrentUser);
                }
                throw;
            }
        }

        public static string HashPin(string pin, string salt)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(salt));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(pin));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        public static bool VerifyPin(string pin, string salt, string expectedHash)
        {
            string actualHash = HashPin(pin, salt);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(actualHash),
                Encoding.UTF8.GetBytes(expectedHash)
            );
        }
    }
}
