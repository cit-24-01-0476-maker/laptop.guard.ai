class SecurityEvent {
  final String id;
  final String deviceId;
  final String eventType;
  final String severity;
  final String description;
  final String createdAt;

  SecurityEvent({
    required this.id,
    required this.deviceId,
    required this.eventType,
    required this.severity,
    required this.description,
    required this.createdAt,
  });

  factory SecurityEvent.fromJson(Map<String, dynamic> json) {
    return SecurityEvent(
      id: json['id'] ?? '',
      deviceId: json['device_id'] ?? '',
      eventType: json['event_type'] ?? '',
      severity: json['severity'] ?? 'INFO',
      description: json['description'] ?? '',
      createdAt: json['created_at'] ?? '',
    );
  }
}
