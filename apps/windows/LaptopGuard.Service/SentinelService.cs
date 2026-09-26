using System;
using System.Diagnostics;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using LaptopGuard.Core.Ipc;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Native;
using LaptopGuard.Core.State;
using LaptopGuard.Core.Storage;
using LaptopGuard.Service.Power;

using LaptopGuard.Core.Cloud;

namespace LaptopGuard.Service
{
    public class SentinelService : IHostedService, IDisposable
    {
        private readonly SecurityStateMachine _stateMachine = new();
        private readonly LocalDurableStore _store = new();
        private readonly NamedPipeIpcServer _ipcServer = new();
        private readonly WindowsPowerWatcher _powerWatcher = new();
        private readonly CancellationTokenSource _cts = new();
        private CloudGatewayClient? _cloudClient;

        public SecurityStateMachine StateMachine => _stateMachine;
        public LocalDurableStore Store => _store;
        public CloudGatewayClient? CloudClient => _cloudClient;

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================");
            Console.WriteLine("  LaptopGuard AI — Windows Sentinel Security Engine");
            Console.WriteLine("  Offline-First Local Hardware Protection (.NET 10)");
            Console.WriteLine("==========================================================");
            Console.ResetColor();

            // 1. Initialize Durable Local SQLite Store
            Console.WriteLine("[INIT] Initializing local durable SQLite database (WAL mode)...");
            await _store.InitializeAsync();
            await _store.LogAuditAsync("SERVICE_START", "Windows Sentinel background service started.");
            Console.WriteLine("[INIT] Local SQLite durable store initialized.");

            // 2. Setup State Machine
            _stateMachine.DeviceId = await _store.GetConfigAsync("DeviceId") ?? Environment.MachineName;
            _stateMachine.OnStateChanged += HandleStateChanged;
            _stateMachine.OnIncidentTriggered += HandleIncidentTriggered;

            // 3. Start Named Pipe IPC Server
            Console.WriteLine($"[INIT] Starting Named Pipe IPC Server on {NamedPipeIpcServer.PipeName}...");
            _ipcServer.OnMessageReceived += HandleIpcMessage;
            _ipcServer.OnClientConnected += (s, id) => Console.WriteLine($"[IPC] Client connected: {id}");
            _ipcServer.OnClientDisconnected += (s, id) => Console.WriteLine($"[IPC] Client disconnected: {id}");
            _ipcServer.Start();

            // 4. Start Hardware Power Watcher
            Console.WriteLine("[INIT] Registering Windows Power Broadcast Hook (GUID_ACDC_POWER_SOURCE)...");
            _powerWatcher.OnPowerSourceChanged += HandlePowerSourceChanged;
            _powerWatcher.Start();

            // 5. Connect Cloud Gateway WebSocket Client
            string cloudUrl = await _store.GetConfigAsync("CloudUrl") ?? "https://laptop-guard-ai.onrender.com";
            Console.WriteLine($"[INIT] Connecting to Cloud Gateway Hub at {cloudUrl}...");
            _cloudClient = new CloudGatewayClient(cloudUrl, _stateMachine.DeviceId, _store, _stateMachine);
            _cloudClient.OnLockRequested += async (s, e) =>
            {
                await _ipcServer.BroadcastAsync(IpcMessage.CreateCommand(IpcCommandType.LockWorkStation));
            };
            _cloudClient.OnAlarmRequested += async (s, activate) =>
            {
                await _ipcServer.BroadcastAsync(IpcMessage.CreateCommand(activate ? IpcCommandType.SoundAlarm : IpcCommandType.StopAlarm));
            };
            _cloudClient.Start();

            var (hasAc, pct) = Win32Native.QueryCurrentPower();
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[STATUS] Hardware Initialized. Power: {(hasAc ? "AC Connected" : "Battery")}, Battery: {pct}%, State: {_stateMachine.CurrentState}");
            Console.ResetColor();
        }

        private async void HandlePowerSourceChanged(object? sender, PowerSource source)
        {
            var sw = Stopwatch.StartNew();
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [HARDWARE EVENT] Power source changed to: {source}");
            Console.ResetColor();

            // Evaluate in state machine
            var incident = _stateMachine.EvaluatePowerEvent(source);
            if (incident != null)
            {
                sw.Stop();
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [ALERT] Incident generated locally in {sw.ElapsedMilliseconds}ms! Dispatching lockdown.");
                Console.ResetColor();
            }
        }

        private async void HandleIncidentTriggered(object? sender, SecurityIncident incident)
        {
            var sw = Stopwatch.StartNew();
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [TRIGGER] Incident ID: {incident.Id} [{incident.EventType}] - {incident.Title}");
            Console.ResetColor();

            // 1. Synchronously persist to durable SQLite store (WAL mode)
            await _store.SaveIncidentAsync(incident);
            await _store.LogAuditAsync("INCIDENT_TRIGGERED", $"{incident.EventType}: {incident.Title}");

            // 2. Broadcast immediately over IPC to SessionAgent (LockWorkStation + Audio Alarm)
            var msg = IpcMessage.CreateIncident(incident);
            await _ipcServer.BroadcastAsync(msg);

            sw.Stop();
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [PERF] Incident durable write & IPC broadcast completed in {sw.ElapsedMilliseconds}ms");
            Console.ResetColor();
        }

        private async void HandleStateChanged(object? sender, DeviceSecurityState newState)
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [STATE] Security State changed to: {newState}");
            Console.ResetColor();

            await _store.LogAuditAsync("STATE_CHANGED", newState.ToString());
            await _ipcServer.BroadcastAsync(IpcMessage.CreateStateChanged(newState));
        }

        private async void HandleIpcMessage(object? sender, IpcMessage msg)
        {
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [IPC-CMD] Received {msg.Type} (Command: {msg.Command})");

            switch (msg.Type)
            {
                case IpcMessageType.Command:
                    if (msg.Command == IpcCommandType.ArmDevice)
                    {
                        int grace = 5;
                        try
                        {
                            if (!string.IsNullOrEmpty(msg.Payload))
                            {
                                using var doc = JsonDocument.Parse(msg.Payload);
                                if (doc.RootElement.TryGetProperty("GraceSeconds", out var gEl))
                                {
                                    grace = gEl.GetInt32();
                                }
                            }
                        }
                        catch { }

                        _stateMachine.Arm(grace);
                    }
                    else if (msg.Command == IpcCommandType.DisarmDevice)
                    {
                        _stateMachine.Disarm();
                    }
                    else if (msg.Command == IpcCommandType.LockWorkStation)
                    {
                        // Forward to session agent
                        await _ipcServer.BroadcastAsync(msg);
                    }
                    break;

                case IpcMessageType.QueryStatus:
                    var (hasAc, pct) = Win32Native.QueryCurrentPower();
                    var resp = new IpcMessage
                    {
                        Type = IpcMessageType.StatusResponse,
                        Payload = JsonSerializer.Serialize(new
                        {
                            State = _stateMachine.CurrentState.ToString(),
                            DeviceId = _stateMachine.DeviceId,
                            PowerSource = hasAc ? "ACPower" : "Battery",
                            BatteryPercentage = pct,
                            Timestamp = DateTime.UtcNow
                        })
                    };
                    await _ipcServer.BroadcastAsync(resp);
                    break;
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            Console.WriteLine("[INFO] Windows Sentinel shutting down...");
            Dispose();
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _cts.Cancel();
            _cloudClient?.Dispose();
            _powerWatcher.Dispose();
            _ipcServer.Dispose();
            _stateMachine.Dispose();
            _store.Dispose();
            _cts.Dispose();
        }
    }
}
