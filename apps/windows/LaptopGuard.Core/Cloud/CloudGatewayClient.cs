using System;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Native;
using LaptopGuard.Core.State;
using LaptopGuard.Core.Storage;

namespace LaptopGuard.Core.Cloud
{
    public class CloudGatewayClient : IDisposable
    {
        private readonly string _cloudBaseUrl;
        private readonly string _deviceId;
        private readonly LocalDurableStore _store;
        private readonly SecurityStateMachine _stateMachine;
        private readonly CommandSignatureVerifier _verifier = new();

        private ClientWebSocket? _webSocket;
        private readonly CancellationTokenSource _cts = new();
        private readonly SemaphoreSlim _sendLock = new(1, 1);
        private System.Threading.Timer? _heartbeatTimer;
        private bool _isConnected = false;

        public bool IsConnected => _isConnected && _webSocket != null && _webSocket.State == WebSocketState.Open;

        public event EventHandler<bool>? OnConnectionStatusChanged;
        public event EventHandler? OnLockRequested;
        public event EventHandler<bool>? OnAlarmRequested;

        public CloudGatewayClient(
            string cloudBaseUrl,
            string deviceId,
            LocalDurableStore store,
            SecurityStateMachine stateMachine)
        {
            _cloudBaseUrl = cloudBaseUrl.TrimEnd('/');
            _deviceId = deviceId;
            _store = store;
            _stateMachine = stateMachine;

            _stateMachine.OnIncidentTriggered += HandleLocalIncident;
            _stateMachine.OnStateChanged += HandleLocalStateChanged;
        }

        public void Start()
        {
            _ = Task.Run(() => ConnectionLoopAsync(_cts.Token));
            _heartbeatTimer = new System.Threading.Timer(SendHeartbeatCallback, null, 5000, 20000);
        }

        private async Task ConnectionLoopAsync(CancellationToken token)
        {
            int backoffSeconds = 2;

            while (!token.IsCancellationRequested)
            {
                try
                {
                    string wsScheme = _cloudBaseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? "wss://" : "ws://";
                    string hostAndPath = _cloudBaseUrl
                        .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
                        .Replace("http://", "", StringComparison.OrdinalIgnoreCase);

                    var wsUri = new Uri($"{wsScheme}{hostAndPath}/ws/device/{_deviceId}");

                    _webSocket = new ClientWebSocket();
                    _webSocket.Options.KeepAliveInterval = TimeSpan.FromSeconds(20);

                    Console.WriteLine($"[CLOUD] Connecting to Cloud Hub at {wsUri}...");
                    await _webSocket.ConnectAsync(wsUri, token);

                    _isConnected = true;
                    backoffSeconds = 2; // Reset backoff on successful connect
                    OnConnectionStatusChanged?.Invoke(this, true);
                    Console.WriteLine($"[CLOUD] Connected securely to Cloud Gateway! Device: {_deviceId}");

                    // Auto-sync any queued offline incidents
                    _ = SyncPendingIncidentsAsync();

                    // Listen loop
                    await ReceiveLoopAsync(_webSocket, token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[CLOUD] Disconnected or unable to reach cloud: {ex.Message}. Reconnecting in {backoffSeconds}s...");
                }
                finally
                {
                    _isConnected = false;
                    OnConnectionStatusChanged?.Invoke(this, false);
                    if (_webSocket != null)
                    {
                        try { _webSocket.Dispose(); } catch { }
                        _webSocket = null;
                    }
                }

                if (!token.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromSeconds(backoffSeconds), token);
                    backoffSeconds = Math.Min(backoffSeconds * 2, 30);
                }
            }
        }

        private async Task ReceiveLoopAsync(ClientWebSocket ws, CancellationToken token)
        {
            var buffer = new byte[8192];
            using var ms = new MemoryStream();

            while (!token.IsCancellationRequested && ws.State == WebSocketState.Open)
            {
                ms.SetLength(0);
                WebSocketReceiveResult result;

                do
                {
                    result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", token);
                        return;
                    }
                    ms.Write(buffer, 0, result.Count);
                }
                while (!result.EndOfMessage);

                string jsonText = Encoding.UTF8.GetString(ms.ToArray());
                if (!string.IsNullOrWhiteSpace(jsonText))
                {
                    _ = ProcessServerMessageAsync(jsonText);
                }
            }
        }

        private async Task ProcessServerMessageAsync(string jsonText)
        {
            try
            {
                using var doc = JsonDocument.Parse(jsonText);
                var root = doc.RootElement;
                string msgType = root.TryGetProperty("type", out var tEl) ? tEl.GetString() ?? "" : "";

                if (msgType == "EXECUTE_COMMAND")
                {
                    if (root.TryGetProperty("data", out var dataEl))
                    {
                        var envelope = JsonSerializer.Deserialize<CommandEnvelope>(dataEl.GetRawText());
                        if (envelope != null)
                        {
                            await HandleIncomingCommandAsync(envelope);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CLOUD ERROR] Error processing incoming message: {ex.Message}");
            }
        }

        private async Task HandleIncomingCommandAsync(CommandEnvelope envelope)
        {
            Console.WriteLine($"[CLOUD CMD] Received remote command: {envelope.CommandType} (ID: {envelope.CommandId})");

            // 1. Verify Cryptographic Integrity & Nonce Freshness
            var (isValid, reason) = _verifier.Verify(envelope);
            if (!isValid)
            {
                Console.WriteLine($"[CLOUD REJECTED] Command {envelope.CommandId} rejected: {reason}");
                await SendCommandResultAsync(envelope.CommandId, "FAILED", reason);
                return;
            }

            // 2. Dispatch Verified Command
            string cmdType = envelope.CommandType.ToUpperInvariant();
            try
            {
                switch (cmdType)
                {
                    case "LOCK_DEVICE":
                    case "LOCK":
                    case "LOCK_WORKSTATION":
                        Console.WriteLine("[CLOUD ACTION] Executing remote workstation lock...");
                        OnLockRequested?.Invoke(this, EventArgs.Empty);
                        Win32Native.LockWorkStation();
                        break;

                    case "ARM_DEVICE":
                    case "ARM":
                        Console.WriteLine("[CLOUD ACTION] Executing remote arm...");
                        _stateMachine.Arm(graceSeconds: 0);
                        break;

                    case "DISARM_DEVICE":
                    case "DISARM":
                    case "UNLOCK":
                    case "UNLOCK_DEVICE":
                    case "UNLOCK_WORKSTATION":
                        Console.WriteLine("[CLOUD ACTION] Executing remote disarm...");
                        _stateMachine.Disarm("RemoteMobile");
                        OnAlarmRequested?.Invoke(this, false);
                        break;

                    case "PLAY_ALARM":
                        Console.WriteLine("[CLOUD ACTION] Triggering remote alarm siren...");
                        OnAlarmRequested?.Invoke(this, true);
                        break;

                    case "STOP_ALARM":
                        Console.WriteLine("[CLOUD ACTION] Stopping remote alarm siren...");
                        OnAlarmRequested?.Invoke(this, false);
                        break;

                    case "ENABLE_LOST_MODE":
                        Console.WriteLine("[CLOUD ACTION] Enabling Lost Mode...");
                        _stateMachine.EnableLostMode("Remote Mobile Command");
                        Win32Native.LockWorkStation();
                        OnAlarmRequested?.Invoke(this, true);
                        break;
                }

                await SendCommandResultAsync(envelope.CommandId, "EXECUTED", "Success");
            }
            catch (Exception ex)
            {
                await SendCommandResultAsync(envelope.CommandId, "FAILED", ex.Message);
            }
        }

        public async Task SendCommandResultAsync(string commandId, string status, string? details = null)
        {
            var payload = new
            {
                type = "COMMAND_RESULT",
                command_id = commandId,
                status = status,
                details = details ?? ""
            };
            await SendJsonAsync(payload);
        }

        private async void SendHeartbeatCallback(object? state)
        {
            if (!IsConnected) return;

            try
            {
                var (hasAc, pct) = Win32Native.QueryCurrentPower();
                var heartbeat = new
                {
                    type = "HEARTBEAT",
                    battery = pct,
                    is_charging = hasAc,
                    current_ssid = "Windows-LAN",
                    ip_address = "127.0.0.1",
                    status = _stateMachine.CurrentState.ToString()
                };

                await SendJsonAsync(heartbeat);
            }
            catch { }
        }

        public async Task SyncPendingIncidentsAsync()
        {
            if (!IsConnected) return;

            try
            {
                var pending = await _store.GetPendingIncidentsAsync(50);
                if (pending.Count == 0) return;

                Console.WriteLine($"[CLOUD SYNC] Synchronizing {pending.Count} pending offline incidents to Cloud Hub...");

                foreach (var inc in pending)
                {
                    var eventPayload = new
                    {
                        type = "SECURITY_EVENT",
                        data = new
                        {
                            event_type = inc.EventType,
                            severity = inc.Severity.ToString().ToUpperInvariant(),
                            description = inc.Description,
                            metadata = new
                            {
                                incident_id = inc.Id,
                                title = inc.Title,
                                timestamp = inc.Timestamp.ToString("o"),
                                details_json = inc.DetailsJson
                            }
                        }
                    };

                    bool sent = await SendJsonAsync(eventPayload);
                    if (sent)
                    {
                        await _store.MarkIncidentSyncedAsync(inc.Id);
                    }
                }

                Console.WriteLine("[CLOUD SYNC] Offline incident synchronization complete.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CLOUD SYNC ERROR] Incident sync exception: {ex.Message}");
            }
        }

        private async void HandleLocalIncident(object? sender, SecurityIncident inc)
        {
            if (!IsConnected) return;

            var eventPayload = new
            {
                type = "SECURITY_EVENT",
                data = new
                {
                    event_type = inc.EventType,
                    severity = inc.Severity.ToString().ToUpperInvariant(),
                    description = inc.Description,
                    metadata = new
                    {
                        incident_id = inc.Id,
                        title = inc.Title,
                        timestamp = inc.Timestamp.ToString("o"),
                        details_json = inc.DetailsJson
                    }
                }
            };

            bool sent = await SendJsonAsync(eventPayload);
            if (sent)
            {
                await _store.MarkIncidentSyncedAsync(inc.Id);
            }
        }

        private async void HandleLocalStateChanged(object? sender, DeviceSecurityState state)
        {
            if (!IsConnected) return;

            string backendStatus = state switch
            {
                DeviceSecurityState.Armed => "Protected",
                DeviceSecurityState.Disarmed => "Disarmed",
                DeviceSecurityState.Triggered => "Warning",
                DeviceSecurityState.LostMode => "Lost",
                _ => "Protected"
            };

            string eventType = state == DeviceSecurityState.Armed ? "ARMED" :
                               state == DeviceSecurityState.Disarmed ? "DISARMED" :
                               state == DeviceSecurityState.Triggered ? "ALARM_TRIGGERED" : "STATE_CHANGED";

            var payload = new
            {
                type = "SECURITY_EVENT",
                data = new
                {
                    event_type = eventType,
                    severity = state == DeviceSecurityState.Triggered ? "CRITICAL" : "INFO",
                    description = $"Sentinel transition to {state}",
                    metadata = new { new_status = backendStatus }
                }
            };

            await SendJsonAsync(payload);
        }

        private async Task<bool> SendJsonAsync(object obj)
        {
            if (_webSocket == null || _webSocket.State != WebSocketState.Open) return false;

            await _sendLock.WaitAsync();
            try
            {
                string json = JsonSerializer.Serialize(obj);
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                return true;
            }
            catch
            {
                return false;
            }
            finally
            {
                _sendLock.Release();
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _heartbeatTimer?.Dispose();
            _stateMachine.OnIncidentTriggered -= HandleLocalIncident;
            _stateMachine.OnStateChanged -= HandleLocalStateChanged;

            if (_webSocket != null)
            {
                try { _webSocket.Dispose(); } catch { }
                _webSocket = null;
            }
            _sendLock.Dispose();
            _cts.Dispose();
        }
    }
}
