using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using LaptopGuard.Core.Ipc;
using LaptopGuard.Core.Models;

namespace LaptopGuard.Tests
{
    public class IpcCommunicationTests : IDisposable
    {
        private readonly NamedPipeIpcServer _server = new();
        private readonly NamedPipeIpcClient _client = new();

        [Fact]
        public async Task ServerAndClient_CanExchangeBidirectionalMessages()
        {
            _server.Start();

            var connectedEvent = new TaskCompletionSource<bool>();
            _client.OnConnected += (s, e) => connectedEvent.TrySetResult(true);

            _client.Start();

            var connected = await Task.WhenAny(connectedEvent.Task, Task.Delay(5000));
            Assert.Equal(connectedEvent.Task, connected);
            Assert.True(_client.IsConnected);

            // Test 1: Server -> Client Broadcast
            var clientReceivedMsg = new TaskCompletionSource<IpcMessage>();
            _client.OnMessageReceived += (s, msg) => clientReceivedMsg.TrySetResult(msg);

            var testIncident = new SecurityIncident
            {
                Id = "test_incident_42",
                DeviceId = "laptop_test",
                EventType = "POWER_DISCONNECT",
                Title = "Power Disconnected",
                Description = "Cable pulled",
                Severity = IncidentSeverity.Critical
            };

            await _server.BroadcastAsync(IpcMessage.CreateIncident(testIncident));

            var completedTask = await Task.WhenAny(clientReceivedMsg.Task, Task.Delay(3000));
            Assert.Equal(clientReceivedMsg.Task, completedTask);

            var receivedMsg = await clientReceivedMsg.Task;
            Assert.Equal(IpcMessageType.IncidentTriggered, receivedMsg.Type);
            Assert.Contains("POWER_DISCONNECT", receivedMsg.Payload);

            // Test 2: Client -> Server Command
            var serverReceivedMsg = new TaskCompletionSource<IpcMessage>();
            _server.OnMessageReceived += (s, msg) => serverReceivedMsg.TrySetResult(msg);

            var testCommand = IpcMessage.CreateCommand(IpcCommandType.ArmDevice, new { GraceSeconds = 0 });
            bool sent = await _client.SendMessageAsync(testCommand);
            Assert.True(sent);

            var serverCompleted = await Task.WhenAny(serverReceivedMsg.Task, Task.Delay(3000));
            Assert.Equal(serverReceivedMsg.Task, serverCompleted);

            var sMsg = await serverReceivedMsg.Task;
            Assert.Equal(IpcMessageType.Command, sMsg.Type);
            Assert.Equal(IpcCommandType.ArmDevice, sMsg.Command);
        }

        public void Dispose()
        {
            _client.Dispose();
            _server.Dispose();
        }
    }
}
