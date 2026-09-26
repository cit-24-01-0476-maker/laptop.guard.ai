using System;
using System.Runtime.InteropServices;

namespace LaptopGuard.Core.Native
{
    public static class Win32Native
    {
        public const int DEVICE_NOTIFY_WINDOW_HANDLE = 0x00000000;
        public const int DEVICE_NOTIFY_SERVICE_HANDLE = 0x00000001;

        // Power Setting GUIDs
        // GUID_ACDC_POWER_SOURCE: 5d3e4a2f-eec4-4a60-9ec9-7f580c3b1513
        public static readonly Guid GUID_ACDC_POWER_SOURCE = new Guid("5d3e4a2f-eec4-4a60-9ec9-7f580c3b1513");

        // GUID_BATTERY_PERCENTAGE_REMAINING: a7ad8041-b45a-4cae-87a3-eecbfbc464e1
        public static readonly Guid GUID_BATTERY_PERCENTAGE_REMAINING = new Guid("a7ad8041-b45a-4cae-87a3-eecbfbc464e1");

        [StructLayout(LayoutKind.Sequential)]
        public struct SYSTEM_POWER_STATUS
        {
            public byte ACLineStatus;         // 0: Offline (battery), 1: Online (AC), 255: Unknown
            public byte BatteryFlag;          // High, Low, Critical, Charging, etc.
            public byte BatteryLifePercent;    // 0..100 or 255
            public byte SystemStatusFlag;
            public uint BatteryLifeTime;
            public uint BatteryFullLifeTime;
        }

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool LockWorkStation();

        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr RegisterPowerSettingNotification(
            IntPtr hRecipient,
            ref Guid PowerSettingGuid,
            int Flags
        );

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool UnregisterPowerSettingNotification(IntPtr Handle);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS lpSystemPowerStatus);

        public static (bool HasAc, int BatteryPct) QueryCurrentPower()
        {
            if (GetSystemPowerStatus(out SYSTEM_POWER_STATUS status))
            {
                bool hasAc = status.ACLineStatus == 1;
                int pct = status.BatteryLifePercent <= 100 ? status.BatteryLifePercent : 100;
                return (hasAc, pct);
            }
            return (true, 100);
        }
    }
}
