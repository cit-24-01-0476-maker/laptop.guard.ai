import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/device.dart';
import '../models/security_event.dart';

class ApiService {
  static const String baseUrl = "http://localhost:8000/api/v1";

  Future<List<Device>> getDevices() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/devices'));
      if (res.statusCode == 200) {
        final List list = json.decode(res.body);
        return list.map((e) => Device.fromJson(e)).toList();
      }
    } catch (_) {}
    // Fallback demo device
    return [
      Device(
        id: 'dev_oska_xps15',
        deviceName: 'Oska Laptop',
        manufacturer: 'Dell',
        model: 'XPS 15 9530',
        os: 'Windows',
        osVersion: '11 Pro',
        agentVersion: '1.4.2',
        status: 'Protected',
        securityMode: 'Balanced',
        battery: 82,
        isCharging: false,
        currentSsid: 'Campus_Secure_5G',
        ipAddress: '192.168.1.142',
        lastSeen: 'Just now',
        locationCity: 'Singapore',
      )
    ];
  }

  Future<bool> dispatchCommand(String deviceId, String commandType, [Map<String, dynamic>? payload]) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/commands/$deviceId'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'command_type': commandType, 'payload': payload ?? {}}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<SecurityEvent>> getEvents() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/events'));
      if (res.statusCode == 200) {
        final List list = json.decode(res.body);
        return list.map((e) => SecurityEvent.fromJson(e)).toList();
      }
    } catch (_) {}
    return [
      SecurityEvent(
        id: 'ev_01',
        deviceId: 'dev_oska_xps15',
        eventType: 'ARMED',
        severity: 'INFO',
        description: 'Laptop armed in Balanced Security Mode.',
        createdAt: 'Just now',
      )
    ];
  }
}
