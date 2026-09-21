class Device {
  final String id;
  final String deviceName;
  final String manufacturer;
  final String model;
  final String os;
  final String osVersion;
  final String agentVersion;
  final String status;
  final String securityMode;
  final int battery;
  final bool isCharging;
  final String currentSsid;
  final String ipAddress;
  final String lastSeen;
  final String locationCity;

  Device({
    required this.id,
    required this.deviceName,
    required this.manufacturer,
    required this.model,
    required this.os,
    required this.osVersion,
    required this.agentVersion,
    required this.status,
    required this.securityMode,
    required this.battery,
    required this.isCharging,
    required this.currentSsid,
    required this.ipAddress,
    required this.lastSeen,
    required this.locationCity,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] ?? '',
      deviceName: json['device_name'] ?? 'Laptop',
      manufacturer: json['manufacturer'] ?? 'Dell',
      model: json['model'] ?? 'XPS 15',
      os: json['os'] ?? 'Windows',
      osVersion: json['os_version'] ?? '11',
      agentVersion: json['agent_version'] ?? '1.4.2',
      status: json['status'] ?? 'Protected',
      securityMode: json['security_mode'] ?? 'Balanced',
      battery: json['battery'] ?? 100,
      isCharging: json['is_charging'] ?? false,
      currentSsid: json['current_ssid'] ?? 'Campus_Secure_5G',
      ipAddress: json['ip_address'] ?? '192.168.1.142',
      lastSeen: json['last_seen'] ?? '',
      locationCity: json['last_location'] != null
          ? (json['last_location']['city'] ?? 'Singapore')
          : 'Singapore',
    );
  }
}
