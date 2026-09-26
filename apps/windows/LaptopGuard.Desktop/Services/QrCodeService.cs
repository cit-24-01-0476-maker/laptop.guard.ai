using System;
using System.IO;
using System.Windows.Media.Imaging;
using QRCoder;

namespace LaptopGuard.Desktop.Services
{
    public static class QrCodeService
    {
        public static BitmapImage GenerateQrCodeImage(string payload)
        {
            using var qrGenerator = new QRCodeGenerator();
            using var qrCodeData = qrGenerator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrCodeData);
            byte[] qrCodeBytes = qrCode.GetGraphic(20);

            var bitmap = new BitmapImage();
            using (var stream = new MemoryStream(qrCodeBytes))
            {
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.StreamSource = stream;
                bitmap.EndInit();
            }
            bitmap.Freeze(); // Make cross-thread accessible in WPF
            return bitmap;
        }
    }
}
