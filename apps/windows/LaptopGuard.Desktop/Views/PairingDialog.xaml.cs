using System;
using System.Windows;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Desktop.Views
{
    public partial class PairingDialog : Window
    {
        private readonly DeviceIdentityManager _identityManager;

        public PairingDialog(DeviceIdentityManager identityManager)
        {
            InitializeComponent();
            _identityManager = identityManager;
            Loaded += async (s, e) => await LoadQrCodeAsync();
        }

        private async System.Threading.Tasks.Task LoadQrCodeAsync()
        {
            try
            {
                var identity = await _identityManager.GetOrCreateIdentityAsync();
                DeviceNameText.Text = identity.DeviceName;
                DeviceIdText.Text = identity.DeviceId;

                string json = await _identityManager.GeneratePairingJsonAsync();
                var bmp = QrCodeService.GenerateQrCodeImage(json);
                QrImage.Source = bmp;
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show($"Failed to generate QR code: {ex.Message}", "Pairing Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void Regenerate_Click(object sender, RoutedEventArgs e)
        {
            await LoadQrCodeAsync();
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
