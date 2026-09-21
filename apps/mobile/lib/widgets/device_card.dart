import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/device.dart';

class DeviceCardWidget extends StatelessWidget {
  final Device device;
  final VoidCallback onTap;

  const DeviceCardWidget({
    Key? key,
    required this.device,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: GuardTheme.cardDark,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: GuardTheme.accentCyan.withOpacity(0.3)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.laptop, color: GuardTheme.accentCyan, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          device.deviceName,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Text(
                          '${device.manufacturer} ${device.model}',
                          style: const TextStyle(fontSize: 12, color: GuardTheme.textMuted),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: GuardTheme.successGreen.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: GuardTheme.successGreen.withOpacity(0.4)),
                  ),
                  child: Text(
                    device.status,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: GuardTheme.successGreen),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildMetric(Icons.battery_charging_full, '${device.battery}%', 'Battery'),
                _buildMetric(Icons.wifi, device.currentSsid, 'Network'),
                _buildMetric(Icons.location_on, device.locationCity, 'Location'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetric(IconData icon, String value, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: GuardTheme.textMuted),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 10, color: GuardTheme.textMuted)),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
