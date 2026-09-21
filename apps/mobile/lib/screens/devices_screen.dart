import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/device.dart';
import '../services/api_service.dart';
import '../widgets/device_card.dart';
import 'qr_pairing_screen.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({Key? key}) : super(key: key);

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  final ApiService _api = ApiService();
  List<Device> _devices = [];

  @override
  void initState() {
    super.initState();
    _api.getDevices().then((val) => setState(() => _devices = val));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Guarded Devices', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: GuardTheme.darkBg,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: GuardTheme.accentCyan),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QrPairingScreen())),
          ),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _devices.length,
        separatorBuilder: (_, __) => const SizedBox(height: 14),
        itemBuilder: (ctx, i) => DeviceCardWidget(
          device: _devices[i],
          onTap: () {},
        ),
      ),
    );
  }
}
