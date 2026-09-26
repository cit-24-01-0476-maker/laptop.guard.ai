using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LaptopGuard.Core.Models
{
    public enum IpcMessageType
    {
        Heartbeat,
        QueryStatus,
        StatusResponse,
        StateChanged,
        Command,
        IncidentTriggered,
        Acknowledge
    }

    public enum IpcCommandType
    {
        LockWorkStation,
        SoundAlarm,
        StopAlarm,
        ArmDevice,
        DisarmDevice,
        TakeSnapshot
    }

    public class IpcMessage
    {
        [JsonPropertyName("messageId")]
        public string MessageId { get; set; } = Guid.NewGuid().ToString("N");

        [JsonPropertyName("type")]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public IpcMessageType Type { get; set; }

        [JsonPropertyName("command")]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public IpcCommandType? Command { get; set; }

        [JsonPropertyName("payload")]
        public string Payload { get; set; } = string.Empty;

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public static IpcMessage CreateCommand(IpcCommandType command, object? payloadObj = null)
        {
            return new IpcMessage
            {
                Type = IpcMessageType.Command,
                Command = command,
                Payload = payloadObj != null ? JsonSerializer.Serialize(payloadObj) : string.Empty
            };
        }

        public static IpcMessage CreateIncident(SecurityIncident incident)
        {
            return new IpcMessage
            {
                Type = IpcMessageType.IncidentTriggered,
                Payload = JsonSerializer.Serialize(incident)
            };
        }

        public static IpcMessage CreateStateChanged(DeviceSecurityState state)
        {
            return new IpcMessage
            {
                Type = IpcMessageType.StateChanged,
                Payload = JsonSerializer.Serialize(new { State = state.ToString() })
            };
        }
    }
}
