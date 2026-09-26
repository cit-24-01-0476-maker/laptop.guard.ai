using System;
using System.Diagnostics;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32;
using LaptopGuard.Core.Ipc;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.Native;
using LaptopGuard.SessionAgent.Audio;

namespace LaptopGuard.SessionAgent
{
    public class Program
    {
        private static readonly AlarmSirenPlayer SirenPlayer = new();
        private static NamedPipeIpcClient? _ipcClient;

        public static async Task Main(string[] args)
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==========================================================");
            Console.WriteLine("  LaptopGuard AI — Interactive Session Agent (.NET 10)");
            Console.WriteLine("  Execution Context: Active User Session (Session 1+)");
            Console.WriteLine("==========================================================");
            Console.ResetColor();

            using var cts = new CancellationTokenSource();
            Console.CancelKeyPress += (s, e) =>
            {
                e.Cancel = true;
                cts.Cancel();
            };

            // Register system session event hooks
            SystemEvents.SessionSwitch += OnSessionSwitch;

            _ipcClient = new NamedPipeIpcClient();
            _ipcClient.OnConnected += (s, e) =>
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [IPC] Connected to LaptopGuard Service Named Pipe.");
                Console.ResetColor();
            };

            _ipcClient.OnDisconnected += (s, e) =>
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [IPC] Disconnected from Service. Reconnecting in background...");
                Console.ResetColor();
            };

            _ipcClient.OnMessageReceived += HandleIpcMessage;
            _ipcClient.Start();

            Console.WriteLine("[INFO] Session Agent listening for hardware security triggers.");
            Console.WriteLine("[INFO] Press Ctrl+C to terminate session agent.");

            try
            {
                await Task.Delay(Timeout.Infinite, cts.Token);
            }
            catch (TaskCanceledException)
            {
                Console.WriteLine("[INFO] Session Agent shutting down cleanly.");
            }
            finally
            {
                SystemEvents.SessionSwitch -= OnSessionSwitch;
                SirenPlayer.Dispose();
                _ipcClient.Dispose();
            }
        }

        private static void HandleIpcMessage(object? sender, IpcMessage msg)
        {
            var sw = Stopwatch.StartNew();
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [IPC-IN] Received {msg.Type} (Command: {msg.Command})");

            switch (msg.Type)
            {
                case IpcMessageType.IncidentTriggered:
                    ExecuteIncidentResponse(msg, sw);
                    break;

                case IpcMessageType.Command:
                    ExecuteCommand(msg.Command, sw);
                    break;

                case IpcMessageType.StateChanged:
                    try
                    {
                        using var doc = JsonDocument.Parse(msg.Payload);
                        if (doc.RootElement.TryGetProperty("State", out var stateEl))
                        {
                            string stateStr = stateEl.GetString() ?? "";
                            if (stateStr == "Disarmed")
                            {
                                SirenPlayer.StopSiren();
                            }
                        }
                    }
                    catch { }
                    break;
            }
        }

        private static void ExecuteIncidentResponse(IpcMessage msg, Stopwatch sw)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [CRITICAL ALERT] Security Incident Triggered!");
            Console.ResetColor();

            // 1. Immediately Lock WorkStation
            var lockSw = Stopwatch.StartNew();
            bool locked = Win32Native.LockWorkStation();
            lockSw.Stop();

            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [ACTION] Win32 LockWorkStation executed in {lockSw.ElapsedMilliseconds}ms (Success: {locked})");

            // 2. Immediately Sound Alarm Siren
            SirenPlayer.PlaySiren();

            sw.Stop();
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [PERF] Total SessionAgent response time: {sw.ElapsedMilliseconds}ms");
            Console.ResetColor();
        }

        private static void ExecuteCommand(IpcCommandType? command, Stopwatch sw)
        {
            switch (command)
            {
                case IpcCommandType.LockWorkStation:
                    Console.WriteLine("[ACTION] Executing Win32 LockWorkStation...");
                    bool locked = Win32Native.LockWorkStation();
                    Console.WriteLine(locked ? "[SUCCESS] Workstation locked." : "[ERROR] LockWorkStation failed.");
                    break;

                case IpcCommandType.SoundAlarm:
                    Console.WriteLine("[ACTION] Sounding emergency siren...");
                    SirenPlayer.PlaySiren();
                    break;

                case IpcCommandType.StopAlarm:
                case IpcCommandType.DisarmDevice:
                    Console.WriteLine("[ACTION] Stopping emergency siren...");
                    SirenPlayer.StopSiren();
                    break;
            }
        }

        private static void OnSessionSwitch(object sender, SessionSwitchEventArgs e)
        {
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [WIN32 SESSION] Event: {e.Reason}");
            if (e.Reason == SessionSwitchReason.SessionUnlock)
            {
                // Can notify service of unlock
                _ = _ipcClient?.SendMessageAsync(new IpcMessage
                {
                    Type = IpcMessageType.Heartbeat,
                    Payload = JsonSerializer.Serialize(new { Event = "SessionUnlock", Time = DateTime.UtcNow })
                });
            }
        }
    }
}
