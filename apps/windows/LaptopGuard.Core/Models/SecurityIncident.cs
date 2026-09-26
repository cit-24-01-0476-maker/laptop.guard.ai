using System;
using System.Text.Json.Serialization;

namespace LaptopGuard.Core.Models
{
    public enum DeviceSecurityState
    {
        Disarmed,
        ArmingGrace,
        Armed,
        Triggered,
        LostMode
    }

    public enum IncidentSeverity
    {
        Info,
        Warning,
        Critical
    }

    public enum PowerSource
    {
        Unknown,
        ACPower,
        Battery
    }

    public class PowerState
    {
        public PowerSource Source { get; set; } = PowerSource.Unknown;
        public int BatteryPercentage { get; set; } = 100;
        public bool IsCharging { get; set; } = true;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class SecurityIncident
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString("N");

        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;

        [JsonPropertyName("eventType")]
        public string EventType { get; set; } = "POWER_DISCONNECT";

        [JsonPropertyName("severity")]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public IncidentSeverity Severity { get; set; } = IncidentSeverity.Critical;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [JsonPropertyName("detailsJson")]
        public string DetailsJson { get; set; } = "{}";

        [JsonPropertyName("syncedToCloud")]
        public bool SyncedToCloud { get; set; } = false;
    }
}
