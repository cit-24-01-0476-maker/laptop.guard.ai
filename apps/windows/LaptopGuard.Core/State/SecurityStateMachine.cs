using System;
using System.Threading;
using System.Threading.Tasks;
using LaptopGuard.Core.Models;

namespace LaptopGuard.Core.State
{
    public class SecurityStateMachine : IDisposable
    {
        private readonly object _stateLock = new();
        private DeviceSecurityState _currentState = DeviceSecurityState.Disarmed;
        private CancellationTokenSource? _graceCts;

        public string DeviceId { get; set; } = "dev_windows_sentinel";

        public DeviceSecurityState CurrentState
        {
            get
            {
                lock (_stateLock)
                {
                    return _currentState;
                }
            }
            private set
            {
                DeviceSecurityState old;
                lock (_stateLock)
                {
                    if (_currentState == value) return;
                    old = _currentState;
                    _currentState = value;
                }
                OnStateChanged?.Invoke(this, value);
            }
        }

        public event EventHandler<DeviceSecurityState>? OnStateChanged;
        public event EventHandler<SecurityIncident>? OnIncidentTriggered;
        public event EventHandler? OnAlarmSilenced;

        public bool Arm(int graceSeconds = 5)
        {
            lock (_stateLock)
            {
                if (_currentState == DeviceSecurityState.Armed || _currentState == DeviceSecurityState.ArmingGrace)
                {
                    return true;
                }

                _graceCts?.Cancel();
                _graceCts?.Dispose();
                _graceCts = null;

                if (graceSeconds <= 0)
                {
                    CurrentState = DeviceSecurityState.Armed;
                    var (hasAc, _) = Native.Win32Native.QueryCurrentPower();
                    if (!hasAc)
                    {
                        TriggerIncident("POWER_DISCONNECT", IncidentSeverity.Critical, "AC Power Disconnected", "AC power already disconnected when armed");
                    }
                    return true;
                }

                CurrentState = DeviceSecurityState.ArmingGrace;
                _graceCts = new CancellationTokenSource();
                var token = _graceCts.Token;

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(graceSeconds), token);
                        lock (_stateLock)
                        {
                            if (_currentState == DeviceSecurityState.ArmingGrace && !token.IsCancellationRequested)
                            {
                                CurrentState = DeviceSecurityState.Armed;
                                var (hasAc, _) = Native.Win32Native.QueryCurrentPower();
                                if (!hasAc)
                                {
                                    TriggerIncident("POWER_DISCONNECT", IncidentSeverity.Critical, "AC Power Disconnected", "AC power disconnected during arming grace");
                                }
                            }
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Arming canceled during grace period
                    }
                }, token);

                return true;
            }
        }

        public bool Disarm(string? actor = null)
        {
            lock (_stateLock)
            {
                _graceCts?.Cancel();
                _graceCts?.Dispose();
                _graceCts = null;

                var prev = _currentState;
                CurrentState = DeviceSecurityState.Disarmed;

                if (prev == DeviceSecurityState.Triggered || prev == DeviceSecurityState.LostMode)
                {
                    OnAlarmSilenced?.Invoke(this, EventArgs.Empty);
                }
                return true;
            }
        }

        public SecurityIncident? EvaluatePowerEvent(PowerSource newSource, string reason = "AC power disconnected while Armed")
        {
            lock (_stateLock)
            {
                if (_currentState != DeviceSecurityState.Armed)
                {
                    // Not armed; unplugging power is permitted
                    return null;
                }

                if (newSource == PowerSource.Battery)
                {
                    return TriggerIncident("POWER_DISCONNECT", IncidentSeverity.Critical, "AC Power Disconnected", reason);
                }

                return null;
            }
        }

        public SecurityIncident TriggerIncident(
            string eventType,
            IncidentSeverity severity,
            string title,
            string description,
            string detailsJson = "{}")
        {
            SecurityIncident incident;
            lock (_stateLock)
            {
                CurrentState = DeviceSecurityState.Triggered;

                incident = new SecurityIncident
                {
                    DeviceId = DeviceId,
                    EventType = eventType,
                    Severity = severity,
                    Title = title,
                    Description = description,
                    Timestamp = DateTime.UtcNow,
                    DetailsJson = detailsJson,
                    SyncedToCloud = false
                };
            }

            // Fire incident notification immediately
            OnIncidentTriggered?.Invoke(this, incident);
            return incident;
        }

        public void EnableLostMode(string reason = "Owner enabled Lost Mode remotely")
        {
            lock (_stateLock)
            {
                CurrentState = DeviceSecurityState.LostMode;
            }
        }

        public void Dispose()
        {
            _graceCts?.Cancel();
            _graceCts?.Dispose();
            _graceCts = null;
        }
    }
}
