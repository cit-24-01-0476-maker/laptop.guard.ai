import 'dart:async';
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/device.dart';

class LiveCameraScreen extends StatefulWidget {
  final Device device;

  const LiveCameraScreen({Key? key, required this.device}) : super(key: key);

  @override
  State<LiveCameraScreen> createState() => _LiveCameraScreenState();
}

class _LiveCameraScreenState extends State<LiveCameraScreen> {
  int _secondsLeft = 300; // 5 minutes max limit
  Timer? _timer;
  bool _snapshotSaved = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        Navigator.pop(context);
      } else {
        setState(() {
          _secondsLeft--;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatTimer(int s) {
    int min = s ~/ 60;
    int sec = s % 60;
    return '${min.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  void _takeSnapshot() {
    setState(() => _snapshotSaved = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Authorized security snapshot saved to Vault!'),
        backgroundColor: GuardTheme.successGreen,
        duration: Duration(seconds: 2),
      ),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _snapshotSaved = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Column(
                    children: [
                      Text(
                        widget.device.deviceName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const Text(
                        'DTLS-SRTP WebRTC Stream',
                        style: TextStyle(color: GuardTheme.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: GuardTheme.dangerRed.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: GuardTheme.dangerRed),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(radius: 3, backgroundColor: GuardTheme.dangerRed),
                        SizedBox(width: 6),
                        Text('LIVE', style: TextStyle(color: GuardTheme.dangerRed, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Mandatory Privacy Banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: GuardTheme.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: GuardTheme.accentCyan.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.privacy_tip, color: GuardTheme.accentCyan, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Camera in use by LaptopGuard AI. On-screen banner & hardware LED active on laptop.',
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),

            // Main Video Feed Viewport
            Expanded(
              child: Container(
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white12),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.videocam, size: 64, color: GuardTheme.accentCyan),
                        SizedBox(height: 12),
                        Text(
                          'WebRTC Encrypted Camera Feed',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '1080p @ 30fps • Direct Peer-to-Peer',
                          style: TextStyle(color: GuardTheme.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _formatTimer(_secondsLeft),
                          style: TextStyle(
                            fontFamily: 'monospace',
                            color: _secondsLeft <= 60 ? GuardTheme.dangerRed : GuardTheme.accentCyan,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Controls
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  IconButton(
                    icon: const Icon(Icons.camera_alt, color: GuardTheme.accentCyan),
                    onPressed: _takeSnapshot,
                    tooltip: 'Take Authorized Snapshot',
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: GuardTheme.dangerRed,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                    icon: const Icon(Icons.stop, color: Colors.white),
                    label: const Text('Stop Stream', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    onPressed: () => Navigator.pop(context),
                  ),
                  IconButton(
                    icon: const Icon(Icons.fullscreen, color: Colors.white),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
