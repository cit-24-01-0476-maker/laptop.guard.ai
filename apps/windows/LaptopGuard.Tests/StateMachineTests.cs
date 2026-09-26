using System;
using System.Threading.Tasks;
using Xunit;
using LaptopGuard.Core.Models;
using LaptopGuard.Core.State;

namespace LaptopGuard.Tests
{
    public class StateMachineTests
    {
        [Fact]
        public void InitialState_IsDisarmed()
        {
            using var fsm = new SecurityStateMachine();
            Assert.Equal(DeviceSecurityState.Disarmed, fsm.CurrentState);
        }

        [Fact]
        public void ArmWithZeroGrace_TransitionsImmediatelyToArmed()
        {
            using var fsm = new SecurityStateMachine();
            bool result = fsm.Arm(graceSeconds: 0);

            Assert.True(result);
            Assert.Equal(DeviceSecurityState.Armed, fsm.CurrentState);
        }

        [Fact]
        public async Task ArmWithGracePeriod_TransitionsToGraceThenArmed()
        {
            using var fsm = new SecurityStateMachine();
            fsm.Arm(graceSeconds: 1);

            Assert.Equal(DeviceSecurityState.ArmingGrace, fsm.CurrentState);

            await Task.Delay(1300);
            Assert.Equal(DeviceSecurityState.Armed, fsm.CurrentState);
        }

        [Fact]
        public void PowerDisconnectWhileDisarmed_DoesNotTriggerIncident()
        {
            using var fsm = new SecurityStateMachine();
            var incident = fsm.EvaluatePowerEvent(PowerSource.Battery);

            Assert.Null(incident);
            Assert.Equal(DeviceSecurityState.Disarmed, fsm.CurrentState);
        }

        [Fact]
        public void PowerDisconnectWhileArmed_TriggersCriticalIncidentImmediately()
        {
            using var fsm = new SecurityStateMachine();
            fsm.Arm(graceSeconds: 0);

            bool incidentFired = false;
            fsm.OnIncidentTriggered += (s, e) => incidentFired = true;

            var incident = fsm.EvaluatePowerEvent(PowerSource.Battery);

            Assert.NotNull(incident);
            Assert.True(incidentFired);
            Assert.Equal("POWER_DISCONNECT", incident.EventType);
            Assert.Equal(IncidentSeverity.Critical, incident.Severity);
            Assert.Equal(DeviceSecurityState.Triggered, fsm.CurrentState);
        }

        [Fact]
        public void Disarm_TransitionsStateBackToDisarmed()
        {
            using var fsm = new SecurityStateMachine();
            fsm.Arm(graceSeconds: 0);
            fsm.EvaluatePowerEvent(PowerSource.Battery);
            Assert.Equal(DeviceSecurityState.Triggered, fsm.CurrentState);

            bool silenced = false;
            fsm.OnAlarmSilenced += (s, e) => silenced = true;

            fsm.Disarm();

            Assert.Equal(DeviceSecurityState.Disarmed, fsm.CurrentState);
            Assert.True(silenced);
        }
    }
}
