import 'package:flutter/material.dart';
import '../core/theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Privacy', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: GuardTheme.darkBg,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Center(
            child: CircleAvatar(
              radius: 36,
              backgroundColor: GuardTheme.cardDark,
              child: Text('OP', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: GuardTheme.accentCyan)),
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text('Oska Perera', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          const Center(
            child: Text('oska@laptopguard.ai', style: TextStyle(color: GuardTheme.textMuted, fontSize: 12)),
          ),
          const SizedBox(height: 30),
          _buildItem(Icons.security, 'Two-Factor Authentication', 'Enforced'),
          _buildItem(Icons.privacy_tip, 'Anti-Covert Privacy Guarantee', 'Active'),
          _buildItem(Icons.delete_forever, 'Purge All Cloud Evidence', 'Manual'),
          _buildItem(Icons.download, 'Export Account Data', 'GDPR Ready'),
        ],
      ),
    );
  }

  Widget _buildItem(IconData icon, String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GuardTheme.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Icon(icon, color: GuardTheme.accentCyan),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                Text(subtitle, style: const TextStyle(color: GuardTheme.textMuted, fontSize: 11)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: GuardTheme.textMuted),
        ],
      ),
    );
  }
}
