using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Native;

namespace LaptopGuard.Service.Power
{
    public class WindowsPowerWatcher : IDisposable
    {
        private const int WM_POWERBROADCAST = 0x0218;
        private const int PBT_POWERSETTINGCHANGE = 0x8013;

        [StructLayout(LayoutKind.Sequential)]
        private struct POWERBROADCAST_SETTING
        {
            public Guid PowerSetting;
            public uint DataLength;
            public byte Data; // First byte of data
        }

        private class PowerNotificationWindow : NativeWindow
        {
            private readonly WindowsPowerWatcher _watcher;

            public PowerNotificationWindow(WindowsPowerWatcher watcher)
            {
                _watcher = watcher;
                var cp = new CreateParams
                {
                    Style = 0, // Top-level invisible window
                    ExStyle = 0x00000080 // WS_EX_TOOLWINDOW (hidden from Alt+Tab and taskbar)
                };
                CreateHandle(cp);
            }

            protected override void WndProc(ref Message m)
            {
                if (m.Msg == WM_POWERBROADCAST && (int)m.WParam == PBT_POWERSETTINGCHANGE)
                {
                    try
                    {
                        var setting = Marshal.PtrToStructure<POWERBROADCAST_SETTING>(m.LParam);
                        if (setting.PowerSetting == Win32Native.GUID_ACDC_POWER_SOURCE)
                        {
                            // 0 = Battery (AC unplugged), 1 = AC Line, 2 = Short term battery
                            var src = setting.Data == 0 ? PowerSource.Battery : PowerSource.ACPower;
                            _watcher.HandlePowerSettingChanged(src);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[POWER ERROR] Parsing power broadcast: {ex.Message}");
                    }
                }
                base.WndProc(ref m);
            }
        }

        private PowerNotificationWindow? _window;
        private IntPtr _hAcNotify = IntPtr.Zero;
        private IntPtr _hBatteryNotify = IntPtr.Zero;
        private Thread? _msgThread;
        private System.Threading.Timer? _pollTimer;
        private PowerSource _lastKnownSource = PowerSource.Unknown;
        private readonly object _lock = new();

        public event EventHandler<PowerSource>? OnPowerSourceChanged;

        public PowerSource CurrentPowerSource
        {
            get { lock (_lock) return _lastKnownSource; }
        }

        public void Start()
        {
            // Baseline query
            var (hasAc, _) = Win32Native.QueryCurrentPower();
            _lastKnownSource = hasAc ? PowerSource.ACPower : PowerSource.Battery;

            // Start dedicated STA thread for message loop
            var readyEvent = new ManualResetEvent(false);
            _msgThread = new Thread(() =>
            {
                try
                {
                    _window = new PowerNotificationWindow(this);
                    var acGuid = Win32Native.GUID_ACDC_POWER_SOURCE;
                    var batGuid = Win32Native.GUID_BATTERY_PERCENTAGE_REMAINING;

                    _hAcNotify = Win32Native.RegisterPowerSettingNotification(
                        _window.Handle,
                        ref acGuid,
                        Win32Native.DEVICE_NOTIFY_WINDOW_HANDLE
                    );

                    _hBatteryNotify = Win32Native.RegisterPowerSettingNotification(
                        _window.Handle,
                        ref batGuid,
                        Win32Native.DEVICE_NOTIFY_WINDOW_HANDLE
                    );

                    readyEvent.Set();
                    Application.Run();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[POWER ERROR] Message thread failure: {ex.Message}");
                    readyEvent.Set();
                }
            })
            {
                IsBackground = true,
                Name = "LaptopGuard.PowerMessagePump"
            };
            _msgThread.SetApartmentState(ApartmentState.STA);
            _msgThread.Start();

            readyEvent.WaitOne(3000);

            // Redundant hardware watchdog check (every 250ms) to guarantee detection
            _pollTimer = new System.Threading.Timer(WatchdogCheck, null, 250, 250);
        }

        private void WatchdogCheck(object? state)
        {
            try
            {
                var (hasAc, _) = Win32Native.QueryCurrentPower();
                var current = hasAc ? PowerSource.ACPower : PowerSource.Battery;
                HandlePowerSettingChanged(current);
            }
            catch { }
        }

        internal void HandlePowerSettingChanged(PowerSource newSource)
        {
            bool changed = false;
            lock (_lock)
            {
                if (_lastKnownSource != newSource)
                {
                    _lastKnownSource = newSource;
                    changed = true;
                }
            }

            if (changed)
            {
                OnPowerSourceChanged?.Invoke(this, newSource);
            }
        }

        public void Dispose()
        {
            _pollTimer?.Dispose();

            if (_hAcNotify != IntPtr.Zero)
            {
                Win32Native.UnregisterPowerSettingNotification(_hAcNotify);
                _hAcNotify = IntPtr.Zero;
            }

            if (_hBatteryNotify != IntPtr.Zero)
            {
                Win32Native.UnregisterPowerSettingNotification(_hBatteryNotify);
                _hBatteryNotify = IntPtr.Zero;
            }

            if (_window != null)
            {
                _window.DestroyHandle();
                _window = null;
            }

            Application.ExitThread();
        }
    }
}
