using System;
using System.Media;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Desktop.Views
{
    public partial class PairingDialog : Window
    {
        private readonly DeviceIdentityManager _identityManager;
        private DispatcherTimer? _pollTimer;
        private DispatcherTimer? _countdownTimer;
        private string? _currentRequestId;
        private int _remainingSeconds = 300;

        public PairingDialog(DeviceIdentityManager identityManager)
        {
            InitializeComponent();
            _identityManager = identityManager;
            Loaded += async (s, e) => await InitializePairingAsync();
            Closed += (s, e) => StopTimers();
        }

        private async Task InitializePairingAsync()
        {
            try
            {
                var identity = await _identityManager.GetOrCreateIdentityAsync();
                DeviceIdText.Text = identity.DeviceId;
                await GenerateNewPairingCodeAsync();
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show($"Pairing setup failed: {ex.Message}", "Pairing Notice", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private async Task GenerateNewPairingCodeAsync()
        {
            StopTimers();
            SuccessBanner.Visibility = Visibility.Collapsed;
            PairingCodeText.Text = "Generating...";
            ExpiryText.Text = "Connecting to security server...";

            string email = EmailInput.Text.Trim();
            var res = await _identityManager.RequestServerPairingCodeAsync(string.IsNullOrEmpty(email) ? null : email);

            if (res != null && !string.IsNullOrEmpty(res.PairingCode))
            {
                _currentRequestId = res.PairingRequestId;
                PairingCodeText.Text = res.PairingCode;
                _remainingSeconds = res.ExpiresInSeconds > 0 ? res.ExpiresInSeconds : 300;

                // QR Code
                try
                {
                    var bmp = QrCodeService.GenerateQrCodeImage(res.QrPayload);
                    QrImage.Source = bmp;
                }
                catch { }

                StartTimers();
            }
            else
            {
                // Fallback to offline pairing code
                string fallbackCode = "LG-" + Guid.NewGuid().ToString("N")[..4].ToUpper() + "-" + Guid.NewGuid().ToString("N")[4..8].ToUpper();
                PairingCodeText.Text = fallbackCode;
                ExpiryText.Text = "⚠️ Offline mode code generated.";
            }
        }

        private void StartTimers()
        {
            // Countdown timer (every 1 second)
            _countdownTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _countdownTimer.Tick += (s, e) =>
            {
                _remainingSeconds--;
                if (_remainingSeconds <= 0)
                {
                    StopTimers();
                    PairingCodeText.Text = "EXPIRED";
                    ExpiryText.Text = "Code expired. Click 'Generate Code' for a new one.";
                    return;
                }

                int mins = _remainingSeconds / 60;
                int secs = _remainingSeconds % 60;
                ExpiryText.Text = $"⏳ Expires in {mins:D2}:{secs:D2}";
            };
            _countdownTimer.Start();

            // Status Poll Timer (every 2.5 seconds)
            _pollTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(2500) };
            _pollTimer.Tick += async (s, e) =>
            {
                if (string.IsNullOrEmpty(_currentRequestId)) return;

                var (status, claimedBy) = await _identityManager.CheckPairingStatusAsync(_currentRequestId);

                if (status == "CLAIMED")
                {
                    StopTimers();
                    // Auto-approve pairing locally on physical laptop
                    bool confirmed = await _identityManager.ConfirmPairingAsync(_currentRequestId);
                    if (confirmed)
                    {
                        try { SystemSounds.Asterisk.Play(); } catch { }
                        SuccessBanner.Visibility = Visibility.Visible;
                        SuccessDetailsText.Text = $"Device successfully bound to {claimedBy ?? "Authorized User"}. Hardware protection active.";
                        PairingCodeText.Text = "PAIRED ✅";
                        ExpiryText.Text = "Physical laptop is fully protected.";
                    }
                }
                else if (status == "CONSUMED")
                {
                    StopTimers();
                    SuccessBanner.Visibility = Visibility.Visible;
                    PairingCodeText.Text = "PAIRED ✅";
                    ExpiryText.Text = "Device is already bound to owner.";
                }
            };
            _pollTimer.Start();
        }

        private void StopTimers()
        {
            _countdownTimer?.Stop();
            _countdownTimer = null;
            _pollTimer?.Stop();
            _pollTimer = null;
        }

        private async void RefreshCode_Click(object sender, RoutedEventArgs e)
        {
            await GenerateNewPairingCodeAsync();
        }

        private void CopyCode_Click(object sender, RoutedEventArgs e)
        {
            if (!string.IsNullOrEmpty(PairingCodeText.Text) && !PairingCodeText.Text.Contains("..."))
            {
                try
                {
                    System.Windows.Clipboard.SetText(PairingCodeText.Text);
                    CopyCodeBtn.Content = "✅ Copied!";
                    var t = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
                    t.Tick += (s, ev) =>
                    {
                        CopyCodeBtn.Content = "📋 Copy Code";
                        t.Stop();
                    };
                    t.Start();
                }
                catch { }
            }
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
