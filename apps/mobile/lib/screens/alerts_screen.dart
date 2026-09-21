import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/security_event.dart';
import '../services/api_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({Key? key}) : super(key: key);

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final ApiService _api = ApiService();
  List<SecurityEvent> _events = [];

  @override
  void initState() {
    super.initState();
    _api.getEvents().then((val) => setState(() => _events = val));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security Alerts', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: GuardTheme.darkBg,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _events.length,
        itemBuilder: (ctx, i) {
          final ev = _events[i];
          final isCrit = ev.severity == 'CRITICAL';
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: GuardTheme.cardDark,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isCrit ? GuardTheme.dangerRed.withOpacity(0.4) : Colors.white12),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  isCrit ? Icons.warning : Icons.shield,
                  color: isCrit ? GuardTheme.dangerRed : GuardTheme.accentCyan,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ev.eventType, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 2),
                      Text(ev.description, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      const SizedBox(height: 6),
                      Text(ev.createdAt, style: const TextStyle(color: GuardTheme.textMuted, fontSize: 10)),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
