using System;
using Xunit;
using LaptopGuard.Core.Security;

namespace LaptopGuard.Tests
{
    public class DpapiVaultTests
    {
        [Fact]
        public void ProtectAndUnprotect_RoundtripsSuccessfully()
        {
            string original = "master-super-secret-key-987654";
            string encrypted = DpapiVault.Protect(original);

            Assert.NotEqual(original, encrypted);
            Assert.NotEmpty(encrypted);

            string decrypted = DpapiVault.Unprotect(encrypted);
            Assert.Equal(original, decrypted);
        }

        [Fact]
        public void PinVerification_AcceptsValidPin_RejectsInvalidPin()
        {
            string pin = "6728";
            string salt = "device_salt_guid_12345";

            string hash = DpapiVault.HashPin(pin, salt);
            Assert.NotEmpty(hash);

            bool valid = DpapiVault.VerifyPin("6728", salt, hash);
            Assert.True(valid);

            bool invalid = DpapiVault.VerifyPin("0000", salt, hash);
            Assert.False(invalid);
        }
    }
}
