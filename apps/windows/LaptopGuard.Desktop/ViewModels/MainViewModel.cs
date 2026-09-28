using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using System.Diagnostics;
using System.IO;
using LaptopGuard.Core.Cloud;
using LaptopGuard.Core.Ipc;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Native;
using LaptopGuard.Core.State;
using LaptopGuard.Core.Storage;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Desktop.ViewModels
{
    public class MainViewModel : INotifyPropertyChanged
    {
        private readonly LocalDurableStore _store = new();
        private readonly NamedPipeIpcClient _ipcClient = new();
        private readonly SecurityStateMachine _stateMachine = new();
        private CloudGatewayClient? _cloudClient;
        private Process? _webcamProcess;
        private DeviceIdentityManager? _identityManager;
        private DispatcherTimer? _graceTimer;
        private int _remainingGrace = 5;

        private DeviceSecurityState _currentState = DeviceSecurityState.Disarmed;
        private string _stateTitle = "DISARMED";
        private string _stateSubtitle = "Sentinel monitoring is currently idle. Click Arm to activate.";
        private string _stateColor = "#64748B";
        private string _stateBadgeColor = "#334155";
        private string _powerSourceText = "Detecting...";
        private string _powerSourceColor = "#94A3B8";
        private int _batteryPercentage = 100;
        private string _batteryText = "100%";
        private string _deviceName = Environment.MachineName;
        private string _deviceId = "dev_loading";
        private string _agentVersion = "v2.0.0 Production";
        private string _toggleArmButtonText = "Arm Sentinel";
        private string _toggleArmButtonColor = "#0284C7";
        private bool _isIpcConnected = false;
        private bool _isCloudConnected = false;

        public event PropertyChangedEventHandler? PropertyChanged;

        public DeviceIdentityManager IdentityManager => _identityManager ??= new DeviceIdentityManager(_store);
        public ObservableCollection<SecurityIncident> RecentIncidents { get; } = new();

        public DeviceSecurityState CurrentState
        {
            get => _currentState;
            set { _currentState = value; OnPropertyChanged(); UpdateVisualStates(); }
        }

        public string StateTitle
        {
            get => _stateTitle;
            set { _stateTitle = value; OnPropertyChanged(); }
        }

        public string StateSubtitle
        {
            get => _stateSubtitle;
            set { _stateSubtitle = value; OnPropertyChanged(); }
        }

        public string StateColor
        {
            get => _stateColor;
            set { _stateColor = value; OnPropertyChanged(); }
        }

        public string StateBadgeColor
        {
            get => _stateBadgeColor;
            set { _stateBadgeColor = value; OnPropertyChanged(); }
        }

        public string PowerSourceText
        {
            get => _powerSourceText;
            set { _powerSourceText = value; OnPropertyChanged(); }
        }

        public string PowerSourceColor
        {
            get => _powerSourceColor;
            set { _powerSourceColor = value; OnPropertyChanged(); }
        }

        public int BatteryPercentage
        {
            get => _batteryPercentage;
            set { _batteryPercentage = value; OnPropertyChanged(); }
        }

        public string BatteryText
        {
            get => _batteryText;
            set { _batteryText = value; OnPropertyChanged(); }
        }

        public string DeviceName
        {
            get => _deviceName;
            set { _deviceName = value; OnPropertyChanged(); }
        }

        public string DeviceId
        {
            get => _deviceId;
            set { _deviceId = value; OnPropertyChanged(); }
        }

        public string AgentVersion
        {
            get => _agentVersion;
            set { _agentVersion = value; OnPropertyChanged(); }
        }

        public string ToggleArmButtonText
        {
            get => _toggleArmButtonText;
            set { _toggleArmButtonText = value; OnPropertyChanged(); }
        }

        public string ToggleArmButtonColor
        {
            get => _toggleArmButtonColor;
            set { _toggleArmButtonColor = value; OnPropertyChanged(); }
        }

        public bool IsIpcConnected
        {
            get => _isIpcConnected;
            set { _isIpcConnected = value; OnPropertyChanged(); }
        }

        public bool IsCloudConnected
        {
            get => _isCloudConnected;
            set { _isCloudConnected = value; OnPropertyChanged(); }
        }

        public async Task InitializeAsync()
        {
            await _store.InitializeAsync();
            var identity = await IdentityManager.GetOrCreateIdentityAsync();
            DeviceName = identity.DeviceName;
            DeviceId = identity.DeviceId;
            _stateMachine.DeviceId = identity.DeviceId;

            // Wire up internal autonomous state machine events
            _stateMachine.OnIncidentTriggered += async (s, inc) =>
            {
                await _store.SaveIncidentAsync(inc);
                System.Windows.Application.Current?.Dispatcher.Invoke(() =>
                {
                    RecentIncidents.Insert(0, inc);
                    CurrentState = DeviceSecurityState.Triggered;
                    Win32Native.LockWorkStation();
                    try { System.Media.SystemSounds.Hand.Play(); } catch { }
                });
            };

            _stateMachine.OnStateChanged += (s, newState) =>
            {
                System.Windows.Application.Current?.Dispatcher.Invoke(() =>
                {
                    CurrentState = newState;
                });
            };

            // Connect to Cloud Gateway for Remote Phone Control, Live Lock, Arm/Disarm
            try
            {
                string cloudUrl = string.IsNullOrWhiteSpace(identity.CloudUrl)
                    ? "https://laptopguard-api.onrender.com"
                    : identity.CloudUrl;

                _cloudClient = new CloudGatewayClient(cloudUrl, identity.DeviceId, _store, _stateMachine);
                _cloudClient.OnConnectionStatusChanged += (s, connected) =>
                {
                    System.Windows.Application.Current?.Dispatcher.Invoke(() =>
                    {
                        IsCloudConnected = connected;
                    });
                };

                _cloudClient.OnLockRequested += (s, e) =>
                {
                    System.Windows.Application.Current?.Dispatcher.Invoke(() =>
                    {
                        LockWorkstationNow();
                    });
                };

                _cloudClient.OnAlarmRequested += (s, shouldAlarm) =>
                {
                    if (shouldAlarm)
                    {
                        Task.Run(async () =>
                        {
                            for (int i = 0; i < 15; i++)
                            {
                                try { Console.Beep(2500, 350); } catch { }
                                try { System.Media.SystemSounds.Hand.Play(); } catch { }
                                await Task.Delay(200);
                            }
                        });
                    }
                };

                _cloudClient.Start();
                StartWebcamStreamer(identity.DeviceId, cloudUrl);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DESKTOP] Cloud Gateway init error: {ex.Message}");
            }

            RefreshHardwareStatus();
            await RefreshIncidentsAsync();

            // 500ms Power Watchdog (AC Tripwire)
            var powerTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
            powerTimer.Tick += (s, e) =>
            {
                RefreshHardwareStatus();
                var (hasAc, _) = Win32Native.QueryCurrentPower();
                if (CurrentState == DeviceSecurityState.Armed && !hasAc)
                {
                    // AC Power Disconnected while Armed!
                    _stateMachine.TriggerIncident("POWER_DISCONNECT", IncidentSeverity.Critical, "AC Power Disconnected", "AC power cable was unplugged while Armed");
                }
            };
            powerTimer.Start();

            // Optional background IPC connection (if service is installed)
            _ipcClient.OnConnected += (s, e) =>
            {
                System.Windows.Application.Current?.Dispatcher.Invoke(() =>
                {
                    IsIpcConnected = true;
                    _ = _ipcClient.SendMessageAsync(new IpcMessage { Type = IpcMessageType.QueryStatus });
                });
            };

            _ipcClient.OnDisconnected += (s, e) =>
            {
                System.Windows.Application.Current?.Dispatcher.Invoke(() => IsIpcConnected = false);
            };

            _ipcClient.OnMessageReceived += HandleIpcMessage;
            try { _ipcClient.Start(); } catch { }
        }

        private void StartWebcamStreamer(string deviceId, string cloudUrl)
        {
            try
            {
                string currentDir = AppDomain.CurrentDomain.BaseDirectory;
                string[] potentialPaths = new[]
                {
                    Path.Combine(currentDir, "webcam_streamer.py"),
                    Path.Combine(currentDir, "..", "..", "..", "..", "webcam_streamer.py"),
                    @"E:\Laptop Securtiy Ai\laptopguard-ai\apps\windows\webcam_streamer.py"
                };

                string? streamerScript = null;
                foreach (var p in potentialPaths)
                {
                    if (File.Exists(p))
                    {
                        streamerScript = Path.GetFullPath(p);
                        break;
                    }
                }

                if (streamerScript != null && File.Exists(streamerScript))
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "python",
                        Arguments = $"\"{streamerScript}\" \"{deviceId}\"",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = false,
                        RedirectStandardError = false
                    };
                    psi.EnvironmentVariables["LAPTOPGUARD_DEVICE_ID"] = deviceId;
                    psi.EnvironmentVariables["LAPTOPGUARD_API_URL"] = cloudUrl.TrimEnd('/') + "/api/v1";

                    _webcamProcess = Process.Start(psi);
                    Console.WriteLine($"[DESKTOP] Started webcam streamer process (PID: {_webcamProcess?.Id}) for {deviceId}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DESKTOP] Could not auto-start webcam streamer: {ex.Message}");
            }
        }

        public void RefreshHardwareStatus()
        {
            var (hasAc, pct) = Win32Native.QueryCurrentPower();
            PowerSourceText = hasAc ? "AC Line Connected" : "Battery Mode (Unplugged)";
            PowerSourceColor = hasAc ? "#10B981" : "#F59E0B";
            BatteryPercentage = pct;
            BatteryText = $"{pct}%";
        }

        public async Task RefreshIncidentsAsync()
        {
            var incidents = await _store.GetRecentIncidentsAsync(30);
            System.Windows.Application.Current?.Dispatcher.Invoke(() =>
            {
                RecentIncidents.Clear();
                foreach (var inc in incidents)
                {
                    RecentIncidents.Add(inc);
                }
            });
        }

        public async Task ArmAsync(int graceSeconds = 5)
        {
            var (hasAc, _) = Win32Native.QueryCurrentPower();
            if (!hasAc)
            {
                System.Windows.MessageBox.Show(
                    "Please plug in your laptop AC charger before arming Sentinel!\n\nLaptopGuard AI monitors your charger cable as an anti-theft tripwire.",
                    "AC Power Required",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning);
                return;
            }

            // Direct autonomous arming with live countdown
            _remainingGrace = graceSeconds > 0 ? graceSeconds : 5;
            CurrentState = DeviceSecurityState.ArmingGrace;
            StateSubtitle = $"Grace countdown active. Arming in {_remainingGrace}s...";

            _graceTimer?.Stop();
            _graceTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _graceTimer.Tick += (s, e) =>
            {
                _remainingGrace--;
                if (_remainingGrace <= 0)
                {
                    _graceTimer?.Stop();
                    _graceTimer = null;
                    _stateMachine.Arm(0);
                    CurrentState = DeviceSecurityState.Armed;
                }
                else
                {
                    StateSubtitle = $"Grace countdown active. Arming in {_remainingGrace}s...";
                }
            };
            _graceTimer.Start();

            // Also forward over IPC if background service is active
            try
            {
                if (IsIpcConnected)
                {
                    var cmd = IpcMessage.CreateCommand(IpcCommandType.ArmDevice, new { GraceSeconds = graceSeconds });
                    await _ipcClient.SendMessageAsync(cmd);
                }
            }
            catch { }
        }

        public async Task DisarmAsync()
        {
            _graceTimer?.Stop();
            _graceTimer = null;
            _stateMachine.Disarm();
            CurrentState = DeviceSecurityState.Disarmed;

            try
            {
                if (IsIpcConnected)
                {
                    var cmd = IpcMessage.CreateCommand(IpcCommandType.DisarmDevice);
                    await _ipcClient.SendMessageAsync(cmd);
                }
            }
            catch { }
        }

        public void LockWorkstationNow()
        {
            Win32Native.LockWorkStation();
        }

        private void HandleIpcMessage(object? sender, IpcMessage msg)
        {
            System.Windows.Application.Current?.Dispatcher.Invoke(async () =>
            {
                switch (msg.Type)
                {
                    case IpcMessageType.StateChanged:
                        try
                        {
                            using var doc = JsonDocument.Parse(msg.Payload);
                            if (doc.RootElement.TryGetProperty("State", out var sEl))
                            {
                                if (Enum.TryParse<DeviceSecurityState>(sEl.GetString(), out var st))
                                {
                                    CurrentState = st;
                                }
                            }
                        }
                        catch { }
                        break;

                    case IpcMessageType.StatusResponse:
                        try
                        {
                            using var doc = JsonDocument.Parse(msg.Payload);
                            if (doc.RootElement.TryGetProperty("State", out var sEl))
                            {
                                if (Enum.TryParse<DeviceSecurityState>(sEl.GetString(), out var st))
                                {
                                    CurrentState = st;
                                }
                            }
                            if (doc.RootElement.TryGetProperty("BatteryPercentage", out var bEl))
                            {
                                BatteryPercentage = bEl.GetInt32();
                                BatteryText = $"{BatteryPercentage}%";
                            }
                        }
                        catch { }
                        break;

                    case IpcMessageType.IncidentTriggered:
                        try
                        {
                            var inc = JsonSerializer.Deserialize<SecurityIncident>(msg.Payload);
                            if (inc != null)
                            {
                                RecentIncidents.Insert(0, inc);
                                CurrentState = DeviceSecurityState.Triggered;
                            }
                        }
                        catch { }
                        break;
                }
            });
        }

        private void UpdateVisualStates()
        {
            switch (_currentState)
            {
                case DeviceSecurityState.Disarmed:
                    StateTitle = "DISARMED";
                    StateSubtitle = "Sentinel monitoring is currently idle. Click Arm to activate.";
                    StateColor = "#64748B";
                    StateBadgeColor = "#334155";
                    ToggleArmButtonText = "Arm Sentinel";
                    ToggleArmButtonColor = "#0284C7";
                    break;

                case DeviceSecurityState.ArmingGrace:
                    StateTitle = "ARMING COUNTDOWN";
                    StateSubtitle = "Grace countdown active. Hardware watchdogs activating shortly...";
                    StateColor = "#F59E0B";
                    StateBadgeColor = "#78350F";
                    ToggleArmButtonText = "Cancel Arming";
                    ToggleArmButtonColor = "#EF4444";
                    break;

                case DeviceSecurityState.Armed:
                    StateTitle = "ARMED & PROTECTED";
                    StateSubtitle = "Hardware watchdogs active. AC power disconnect will trigger instant lock & siren.";
                    StateColor = "#10B981";
                    StateBadgeColor = "#064E3B";
                    ToggleArmButtonText = "Disarm (PIN Required)";
                    ToggleArmButtonColor = "#EF4444";
                    break;

                case DeviceSecurityState.Triggered:
                    StateTitle = "ALARM TRIGGERED / LOCKDOWN";
                    StateSubtitle = "Physical security incident detected! Workstation locked & alarm active.";
                    StateColor = "#EF4444";
                    StateBadgeColor = "#7F1D1D";
                    ToggleArmButtonText = "Silence & Disarm (PIN Required)";
                    ToggleArmButtonColor = "#EF4444";
                    break;

                case DeviceSecurityState.LostMode:
                    StateTitle = "LOST MODE ACTIVE";
                    StateSubtitle = "Device is flagged as lost. Continuous beaconing and lockdown enforced.";
                    StateColor = "#EF4444";
                    StateBadgeColor = "#7F1D1D";
                    ToggleArmButtonText = "Disarm (PIN Required)";
                    ToggleArmButtonColor = "#EF4444";
                    break;
            }
        }

        private void OnPropertyChanged([CallerMemberName] string? propName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propName));
        }
    }
}
