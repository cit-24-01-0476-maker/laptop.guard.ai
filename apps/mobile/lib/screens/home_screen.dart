import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/device.dart';
import '../services/api_service.dart';
import '../widgets/device_card.dart';
import '../widgets/quick_action_btn.dart';
import 'live_camera_screen.dart';
import 'map_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _api = ApiService();
  List<Device> _devices = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final devs = await _api.getDevices();
    setState(() {
      _devices = devs;
      _isLoading = false;
    });
  }

  void _triggerLock(Device d) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: GuardTheme.cardDark,
        title: const Text('Lock Workstation Now?', style: TextStyle(color: Colors.white)),
        content: Text('Send signed remote lock command to ${d.deviceName}?', style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: GuardTheme.accentCyan),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Lock Now', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _api.dispatchCommand(d.id, 'LOCK_DEVICE');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Remote lock command dispatched!'), backgroundColor: GuardTheme.successGreen),
      );
    }
  }

  void _triggerAlarm(Device d) async {
    await _api.dispatchCommand(d.id, 'PLAY_ALARM');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('High-decibel alarm triggered!'), backgroundColor: GuardTheme.warningAmber),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primary = _devices.isNotEmpty ? _devices.first : null;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: GuardTheme.accentCyan,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting & Profile Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Good Evening,', style: TextStyle(fontSize: 14, color: GuardTheme.textMuted)),
                        Text('Oska Perera', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(colors: [GuardTheme.accentCyan, GuardTheme.securityBlue]),
                      ),
                      child: const CircleAvatar(
                        radius: 20,
                        backgroundColor: GuardTheme.cardDark,
                        child: Text('OP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Primary Guarded Device
                const Text('Guarded Device', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 12),
                if (primary != null)
                  DeviceCardWidget(
                    device: primary,
                    onTap: () {},
                  )
                else
                  const Center(child: CircularProgressIndicator(color: GuardTheme.accentCyan)),
                const SizedBox(height: 24),

                // Quick Action Buttons
                if (primary != null) ...[
                  const Text('Quick Defense Actions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      QuickActionButton(
                        icon: Icons.lock,
                        label: 'Lock',
                        onTap: () => _triggerLock(primary),
                      ),
                      QuickActionButton(
                        icon: Icons.volume_up,
                        label: 'Alarm',
                        color: GuardTheme.warningAmber,
                        onTap: () => _triggerAlarm(primary),
                      ),
                      QuickActionButton(
                        icon: Icons.near_me,
                        label: 'Find',
                        color: GuardTheme.securityBlue,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MapScreen())),
                      ),
                      QuickActionButton(
                        icon: Icons.videocam,
                        label: 'Live Cam',
                        color: Colors.indigoAccent,
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => LiveCameraScreen(device: primary))),
                      ),
                      QuickActionButton(
                        icon: Icons.warning_amber_rounded,
                        label: 'Lost Mode',
                        color: GuardTheme.dangerRed,
                        onTap: () {
                          _api.dispatchCommand(primary.id, 'ENABLE_LOST_MODE');
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Lost Mode Activated!'), backgroundColor: GuardTheme.dangerRed),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
