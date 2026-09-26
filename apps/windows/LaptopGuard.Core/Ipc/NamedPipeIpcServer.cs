using System;
using System.Collections.Concurrent;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using LaptopGuard.Core.Models;

namespace LaptopGuard.Core.Ipc
{
    public class NamedPipeIpcServer : IDisposable
    {
        public const string PipeName = "LaptopGuardSecurity";
        private readonly string _pipeName;
        private readonly CancellationTokenSource _cts = new();
        private readonly ConcurrentDictionary<string, NamedPipeServerStream> _clients = new();

        public NamedPipeIpcServer(string pipeName = PipeName)
        {
            _pipeName = pipeName;
        }

        public event EventHandler<IpcMessage>? OnMessageReceived;
        public event EventHandler<string>? OnClientConnected;
        public event EventHandler<string>? OnClientDisconnected;

        public void Start()
        {
            _ = Task.Run(() => ListenLoopAsync(_cts.Token));
        }

        private async Task ListenLoopAsync(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    var server = new NamedPipeServerStream(
                        _pipeName,
                        PipeDirection.InOut,
                        NamedPipeServerStream.MaxAllowedServerInstances,
                        PipeTransmissionMode.Byte,
                        PipeOptions.Asynchronous
                    );

                    await server.WaitForConnectionAsync(token);

                    string clientId = Guid.NewGuid().ToString("N");
                    _clients[clientId] = server;
                    OnClientConnected?.Invoke(this, clientId);

                    _ = Task.Run(() => HandleClientAsync(clientId, server, token), token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception)
                {
                    await Task.Delay(500, token);
                }
            }
        }

        private async Task HandleClientAsync(string clientId, NamedPipeServerStream stream, CancellationToken token)
        {
            using var reader = new StreamReader(stream, Encoding.UTF8, false, 4096, leaveOpen: true);
            try
            {
                while (!token.IsCancellationRequested && stream.IsConnected)
                {
                    string? line = await reader.ReadLineAsync(token);
                    if (line == null) break;

                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        try
                        {
                            var msg = JsonSerializer.Deserialize<IpcMessage>(line);
                            if (msg != null)
                            {
                                OnMessageReceived?.Invoke(this, msg);
                            }
                        }
                        catch (JsonException)
                        {
                            // Malformed message discarded
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Disconnected or cancelled
            }
            finally
            {
                _clients.TryRemove(clientId, out _);
                stream.Dispose();
                OnClientDisconnected?.Invoke(this, clientId);
            }
        }

        public async Task BroadcastAsync(IpcMessage message)
        {
            string json = JsonSerializer.Serialize(message) + "\n";
            byte[] bytes = Encoding.UTF8.GetBytes(json);

            foreach (var kvp in _clients)
            {
                var client = kvp.Value;
                if (client.IsConnected)
                {
                    try
                    {
                        await client.WriteAsync(bytes, 0, bytes.Length);
                        await client.FlushAsync();
                    }
                    catch
                    {
                        // Stale connection handled in client loop
                    }
                }
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            foreach (var kvp in _clients)
            {
                try { kvp.Value.Dispose(); } catch { }
            }
            _clients.Clear();
            _cts.Dispose();
        }
    }
}
