using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using LaptopGuard.Core.Native;

namespace LaptopGuard.Desktop.Services
{
    public class TrayIconManager : IDisposable
    {
        private readonly NotifyIcon _notifyIcon;
        private readonly Action _onOpenDashboard;
        private readonly Action _onArmRequested;
        private readonly Action _onDisarmRequested;
        private readonly Action _onExitRequested;

        public TrayIconManager(
            Action onOpenDashboard,
            Action onArmRequested,
            Action onDisarmRequested,
            Action onExitRequested)
        {
            _onOpenDashboard = onOpenDashboard;
            _onArmRequested = onArmRequested;
            _onDisarmRequested = onDisarmRequested;
            _onExitRequested = onExitRequested;

            _notifyIcon = new NotifyIcon
            {
                Text = "LaptopGuard AI — Hardware Sentinel",
                Visible = true
            };

            // Load icon
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app_icon.ico");
                if (File.Exists(iconPath))
                {
                    _notifyIcon.Icon = new Icon(iconPath);
                }
                else
                {
                    _notifyIcon.Icon = SystemIcons.Shield;
                }
            }
            catch
            {
                _notifyIcon.Icon = SystemIcons.Shield;
            }

            // Build Context Menu
            var menu = new ContextMenuStrip();
            menu.Items.Add("Open Sentinel Dashboard", null, (s, e) => _onOpenDashboard());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Arm Sentinel (5s Grace)", null, (s, e) => _onArmRequested());
            menu.Items.Add("Disarm Sentinel (PIN Required)", null, (s, e) => _onDisarmRequested());
            menu.Items.Add("Lock Workstation Now", null, (s, e) => Win32Native.LockWorkStation());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit LaptopGuard", null, (s, e) => _onExitRequested());

            _notifyIcon.ContextMenuStrip = menu;
            _notifyIcon.DoubleClick += (s, e) => _onOpenDashboard();
        }

        public void UpdateStatus(string stateDescription, bool isArmed, bool isTriggered)
        {
            string tooltip = $"LaptopGuard AI — {stateDescription}";
            if (tooltip.Length > 63) tooltip = tooltip[..63];
            _notifyIcon.Text = tooltip;

            if (isTriggered)
            {
                _notifyIcon.ShowBalloonTip(3000, "SECURITY ALERT", "LaptopGuard Sentinel triggered alarm!", ToolTipIcon.Error);
            }
        }

        public void ShowNotification(string title, string text, ToolTipIcon icon = ToolTipIcon.Info)
        {
            _notifyIcon.ShowBalloonTip(3000, title, text, icon);
        }

        public void Dispose()
        {
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
        }
    }
}
