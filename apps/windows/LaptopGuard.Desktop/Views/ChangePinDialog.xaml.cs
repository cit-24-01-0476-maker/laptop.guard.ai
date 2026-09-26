using System.Windows;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Desktop.Views
{
    public partial class ChangePinDialog : Window
    {
        private readonly DeviceIdentityManager _identityManager;

        public ChangePinDialog(DeviceIdentityManager identityManager)
        {
            InitializeComponent();
            _identityManager = identityManager;
            Loaded += (s, e) => CurrentPinBox.Focus();
        }

        private async void Save_Click(object sender, RoutedEventArgs e)
        {
            string current = CurrentPinBox.Password;
            string newPin = NewPinBox.Password;
            string confirm = ConfirmPinBox.Password;

            if (string.IsNullOrWhiteSpace(current))
            {
                ShowError("Please enter your current PIN.");
                return;
            }

            bool validCurrent = await _identityManager.VerifyPinAsync(current);
            if (!validCurrent)
            {
                ShowError("Current PIN is incorrect.");
                CurrentPinBox.SelectAll();
                CurrentPinBox.Focus();
                return;
            }

            if (string.IsNullOrWhiteSpace(newPin) || newPin.Length < 4)
            {
                ShowError("New PIN must be at least 4 digits.");
                NewPinBox.Focus();
                return;
            }

            if (newPin != confirm)
            {
                ShowError("New PINs do not match.");
                ConfirmPinBox.Focus();
                return;
            }

            await _identityManager.SetMasterPinAsync(newPin);
            System.Windows.MessageBox.Show("Master PIN updated successfully.", "Security Updated", MessageBoxButton.OK, MessageBoxImage.Information);
            DialogResult = true;
            Close();
        }

        private void ShowError(string msg)
        {
            ErrorText.Text = msg;
            ErrorText.Visibility = Visibility.Visible;
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
