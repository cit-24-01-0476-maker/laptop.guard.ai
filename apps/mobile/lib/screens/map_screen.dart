import 'package:flutter/material.dart';
import '../core/theme.dart';

class MapScreen extends StatelessWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Location Radar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: GuardTheme.darkBg,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: GuardTheme.accentCyan),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Polling latest Wi-Fi / IP coordinates...')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Radar Map Canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: GuardTheme.cardDark,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: GuardTheme.accentCyan.withOpacity(0.2)),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: GuardTheme.accentCyan.withOpacity(0.2)),
                      color: GuardTheme.accentCyan.withOpacity(0.04),
                    ),
                  ),
                  Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: GuardTheme.accentCyan.withOpacity(0.4)),
                      color: GuardTheme.accentCyan.withOpacity(0.08),
                    ),
                  ),
                  const CircleAvatar(
                    radius: 24,
                    backgroundColor: GuardTheme.accentCyan,
                    child: Icon(Icons.laptop, color: Colors.black, size: 24),
                  ),
                ],
              ),
            ),
          ),

          // Location Info Sheet
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: GuardTheme.cardDark,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Last Known Location', style: TextStyle(color: GuardTheme.textMuted, fontSize: 12)),
                SizedBox(height: 4),
                Text('Singapore (Queenstown)', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('Accuracy: ~180 meters • Wi-Fi BSSID Triangulation', style: TextStyle(color: GuardTheme.accentCyan, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
