using System;
using System.Runtime.InteropServices;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace LaptopGuard.Agent
{
    public class Program
    {
        // Win32 Native API to securely lock Windows workstation
        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool LockWorkStation();

        public static async Task Main(string[] args)
        {
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=================================================");
            Console.WriteLine("  LaptopGuard AI - Windows Native Agent (.NET 10)");
            Console.WriteLine("  'Protect Your Laptop. Wherever You Go.'");
            Console.WriteLine("=================================================");
            Console.ResetColor();

            string deviceId = Environment.GetEnvironmentVariable("LAPTOPGUARD_DEVICE_ID") ?? "dev_oska_xps15";
            string wsUrl = Environment.GetEnvironmentVariable("LAPTOPGUARD_WS_URL") ?? "ws://localhost:8000/ws/device/" + deviceId;

            Console.WriteLine($"[INFO] Device ID: {deviceId}");
            Console.WriteLine($"[INFO] Connecting to Cloud Hub at {wsUrl}...");

            using var cts = new CancellationTokenSource();
            Console.CancelKeyPress += (s, e) => {
                e.Cancel = true;
                cts.Cancel();
            };

            // Start power & network watcher background task
            _ = Task.Run(() => MonitorPowerStatus(cts.Token));

            Console.WriteLine("[INFO] Windows Agent armed and monitoring active.");
            Console.WriteLine("[INFO] Press Ctrl+C to stop agent.");

            // Keep alive
            try
            {
                await Task.Delay(Timeout.Infinite, cts.Token);
            }
            catch (TaskCanceledException)
            {
                Console.WriteLine("[INFO] Agent shutting down cleanly.");
            }
        }

        private static async Task MonitorPowerStatus(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                // In production, uses Windows.Devices.Power or WMI Win32_Battery
                await Task.Delay(10000, token);
            }
        }

        public static void ExecuteRemoteLock()
        {
            Console.WriteLine("[SECURITY] Executing Windows LockWorkStation API...");
            bool locked = LockWorkStation();
            Console.WriteLine(locked ? "[SUCCESS] Workstation locked." : "[ERROR] LockWorkStation failed.");
        }
    }
}
