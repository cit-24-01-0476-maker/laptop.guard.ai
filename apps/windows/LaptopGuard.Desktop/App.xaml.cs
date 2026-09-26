using System;
using System.Diagnostics;
using System.IO;
using System.Windows;

namespace LaptopGuard.Desktop;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        EnsureBackgroundEnginesRunning();
    }

    private static void EnsureBackgroundEnginesRunning()
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;

        // 1. Ensure LaptopGuard.Service is running
        if (Process.GetProcessesByName("LaptopGuard.Service").Length == 0)
        {
            string serviceExe = Path.Combine(baseDir, "LaptopGuard.Service.exe");
            if (File.Exists(serviceExe))
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = serviceExe,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process.Start(psi);
                }
                catch { }
            }
        }

        // 2. Ensure LaptopGuard.SessionAgent is running
        if (Process.GetProcessesByName("LaptopGuard.SessionAgent").Length == 0)
        {
            string sessionExe = Path.Combine(baseDir, "LaptopGuard.SessionAgent.exe");
            if (File.Exists(sessionExe))
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = sessionExe,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process.Start(psi);
                }
                catch { }
            }
        }
    }
}
