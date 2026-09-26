using System.Windows;
using System.Windows.Input;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Desktop.Views
{
    public partial class PinDialog : Window
    {
        private readonly DeviceIdentityManager _identityManager;

        public PinDialog(DeviceIdentityManager identityManager)
        {
            InitializeComponent();
            _identityManager = identityManager;
            Loaded += (s, e) => PinBox.Focus();
        }

        private async void Verify_Click(object sender, RoutedEventArgs e)
        {
            await ValidatePinAsync();
        }

        private async void PinBox_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                await ValidatePinAsync();
            }
            else if (e.Key == Key.Escape)
            {
                DialogResult = false;
                Close();
            }
        }

        private async System.Threading.Tasks.Task ValidatePinAsync()
        {
            string pin = PinBox.Password;
            if (string.IsNullOrWhiteSpace(pin))
            {
                ShowError("Please enter your Master PIN.");
                return;
            }

            bool valid = await _identityManager.VerifyPinAsync(pin);
            if (valid)
            {
                DialogResult = true;
                Close();
            }
            else
            {
                ShowError("Invalid Security PIN. Access Denied.");
                PinBox.SelectAll();
                PinBox.Focus();
            }
        }

        private void ShowError(string message)
        {
            ErrorText.Text = message;
            ErrorText.Visibility = Visibility.Visible;
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
