import 'package:flutter/material.dart';
import '../core/theme.dart';

class QrPairingScreen extends StatelessWidget {
  const QrPairingScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pair Device', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: GuardTheme.darkBg,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                color: GuardTheme.cardDark,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: GuardTheme.accentCyan, width: 2),
              ),
              child: const Icon(Icons.qr_code_scanner, size: 100, color: GuardTheme.accentCyan),
            ),
            const SizedBox(height: 24),
            const Text(
              'Point Camera at Laptop Screen',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Scan the one-time pairing QR code displayed by the LaptopGuard Desktop Agent.',
              style: TextStyle(color: GuardTheme.textMuted, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
