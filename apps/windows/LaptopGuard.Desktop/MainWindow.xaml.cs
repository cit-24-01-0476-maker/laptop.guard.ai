using System;
using System.ComponentModel;
using System.Windows;
using System.Windows.Input;
using LaptopGuard.Core.Models;
using LaptopGuard.Desktop.Services;
using LaptopGuard.Desktop.ViewModels;
using LaptopGuard.Desktop.Views;

namespace LaptopGuard.Desktop
{
    public partial class MainWindow : Window
    {
        private readonly MainViewModel _vm;
        private TrayIconManager? _trayIconManager;
        private bool _isExplicitExit = false;

        public MainWindow()
        {
            InitializeComponent();
            _vm = (MainViewModel)DataContext;

            Loaded += async (s, e) =>
            {
                await _vm.InitializeAsync();
                SetupTrayIcon();
            };
        }

        private void SetupTrayIcon()
        {
            _trayIconManager = new TrayIconManager(
                onOpenDashboard: () =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        Show();
                        WindowState = WindowState.Normal;
                        Activate();
                    });
                },
                onArmRequested: async () =>
                {
                    await _vm.ArmAsync(5);
                },
                onDisarmRequested: () =>
                {
                    Dispatcher.Invoke(async () =>
                    {
                        var dlg = new PinDialog(_vm.IdentityManager) { Owner = this };
                        if (dlg.ShowDialog() == true)
                        {
                            await _vm.DisarmAsync();
                        }
                    });
                },
                onExitRequested: () =>
                {
                    Dispatcher.Invoke(async () =>
                    {
                        var dlg = new PinDialog(_vm.IdentityManager) { Owner = this };
                        if (dlg.ShowDialog() == true)
                        {
                            _isExplicitExit = true;
                            _trayIconManager?.Dispose();
                            System.Windows.Application.Current.Shutdown();
                        }
                    });
                }
            );

            // Update tray icon whenever state changes
            _vm.PropertyChanged += (s, e) =>
            {
                if (e.PropertyName == nameof(MainViewModel.CurrentState))
                {
                    bool isArmed = _vm.CurrentState == DeviceSecurityState.Armed;
                    bool isTriggered = _vm.CurrentState == DeviceSecurityState.Triggered || _vm.CurrentState == DeviceSecurityState.LostMode;
                    _trayIconManager?.UpdateStatus(_vm.StateTitle, isArmed, isTriggered);
                }
            };
        }

        private void Header_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ButtonState == MouseButtonState.Pressed)
            {
                DragMove();
            }
        }

        private void Minimize_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            // Minimize to system tray
            Hide();
            _trayIconManager?.ShowNotification(
                "LaptopGuard AI Sentinel Active",
                "LaptopGuard continues running in the system tray to monitor hardware security."
            );
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            if (!_isExplicitExit)
            {
                e.Cancel = true;
                Hide();
                _trayIconManager?.ShowNotification(
                    "LaptopGuard AI Sentinel Active",
                    "LaptopGuard continues running in the background."
                );
            }
            base.OnClosing(e);
        }

        private async void ToggleArm_Click(object sender, RoutedEventArgs e)
        {
            if (_vm.CurrentState == DeviceSecurityState.Disarmed)
            {
                await _vm.ArmAsync(graceSeconds: 5);
            }
            else
            {
                // Armed, ArmingGrace, or Triggered requires PIN verification to disarm
                var dlg = new PinDialog(_vm.IdentityManager) { Owner = this };
                if (dlg.ShowDialog() == true)
                {
                    await _vm.DisarmAsync();
                }
            }
        }

        private void LockNow_Click(object sender, RoutedEventArgs e)
        {
            _vm.LockWorkstationNow();
        }

        private void PairPhone_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new PairingDialog(_vm.IdentityManager) { Owner = this };
            dlg.ShowDialog();
        }

        private void ChangePin_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new ChangePinDialog(_vm.IdentityManager) { Owner = this };
            dlg.ShowDialog();
        }

        private async void RefreshFeed_Click(object sender, RoutedEventArgs e)
        {
            _vm.RefreshHardwareStatus();
            await _vm.RefreshIncidentsAsync();
        }
    }
}