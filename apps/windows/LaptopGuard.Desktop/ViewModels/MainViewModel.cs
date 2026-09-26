using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using LaptopGuard.Core.Ipc;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Native;
using LaptopGuard.Core.Storage;
using LaptopGuard.Desktop.Services;

namespace LaptopGuard.Desktop.ViewModels
{
    public class MainViewModel : INotifyPropertyChanged
    {
        private readonly LocalDurableStore _store = new();
        private readonly NamedPipeIpcClient _ipcClient = new();
        private DeviceIdentityManager? _identityManager;

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

        public async Task InitializeAsync()
        {
            await _store.InitializeAsync();
            var identity = await IdentityManager.GetOrCreateIdentityAsync();
            DeviceName = identity.DeviceName;
            DeviceId = identity.DeviceId;

            RefreshHardwareStatus();
            await RefreshIncidentsAsync();

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
            _ipcClient.Start();
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
            var cmd = IpcMessage.CreateCommand(IpcCommandType.ArmDevice, new { GraceSeconds = graceSeconds });
            await _ipcClient.SendMessageAsync(cmd);
        }

        public async Task DisarmAsync()
        {
            var cmd = IpcMessage.CreateCommand(IpcCommandType.DisarmDevice);
            await _ipcClient.SendMessageAsync(cmd);
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
