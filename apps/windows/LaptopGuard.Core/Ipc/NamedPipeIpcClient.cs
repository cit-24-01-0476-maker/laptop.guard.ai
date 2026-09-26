using System;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using LaptopGuard.Core.Models;

namespace LaptopGuard.Core.Ipc
{
    public class NamedPipeIpcClient : IDisposable
    {
        public const string PipeName = "LaptopGuardSecurity";
        private NamedPipeClientStream? _clientStream;
        private readonly CancellationTokenSource _cts = new();
        private readonly SemaphoreSlim _writeLock = new(1, 1);

        public bool IsConnected => _clientStream != null && _clientStream.IsConnected;
        public event EventHandler<IpcMessage>? OnMessageReceived;
        public event EventHandler? OnConnected;
        public event EventHandler? OnDisconnected;

        public void Start()
        {
            _ = Task.Run(() => ConnectionLoopAsync(_cts.Token));
        }

        private async Task ConnectionLoopAsync(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    _clientStream = new NamedPipeClientStream(".", PipeName, PipeDirection.InOut, PipeOptions.Asynchronous);
                    await _clientStream.ConnectAsync(3000, token);

                    OnConnected?.Invoke(this, EventArgs.Empty);

                    using var reader = new StreamReader(_clientStream, Encoding.UTF8, false, 4096, leaveOpen: true);
                    while (!token.IsCancellationRequested && _clientStream.IsConnected)
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
                            catch (JsonException) { }
                        }
                    }
                }
                catch (TimeoutException)
                {
                    // Service might not be running yet, retry
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception)
                {
                    // Disconnected or connection error, wait before retry
                }
                finally
                {
                    if (_clientStream != null)
                    {
                        try { _clientStream.Dispose(); } catch { }
                        _clientStream = null;
                        OnDisconnected?.Invoke(this, EventArgs.Empty);
                    }
                }

                if (!token.IsCancellationRequested)
                {
                    await Task.Delay(2000, token);
                }
            }
        }

        public async Task<bool> SendMessageAsync(IpcMessage message)
        {
            if (_clientStream == null || !_clientStream.IsConnected) return false;

            await _writeLock.WaitAsync();
            try
            {
                string json = JsonSerializer.Serialize(message) + "\n";
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                await _clientStream.WriteAsync(bytes, 0, bytes.Length);
                await _clientStream.FlushAsync();
                return true;
            }
            catch
            {
                return false;
            }
            finally
            {
                _writeLock.Release();
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            if (_clientStream != null)
            {
                try { _clientStream.Dispose(); } catch { }
            }
            _writeLock.Dispose();
            _cts.Dispose();
        }
    }
}
