import 'package:flutter/material.dart';

class GuardTheme {
  static const Color darkBg = Color(0xFF070A12);
  static const Color cardDark = Color(0xFF0F172A);
  static const Color accentCyan = Color(0xFF00E5FF);
  static const Color securityBlue = Color(0xFF3B82F6);
  static const Color dangerRed = Color(0xFFFF2A55);
  static const Color successGreen = Color(0xFF10B981);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color textMuted = Color(0xFF94A3B8);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: accentCyan,
      cardColor: cardDark,
      colorScheme: const ColorScheme.dark(
        primary: accentCyan,
        secondary: securityBlue,
        error: dangerRed,
        surface: cardDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkBg,
        elevation: 0,
        centerTitle: false,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF0B0F19),
        selectedItemColor: accentCyan,
        unselectedItemColor: Color(0xFF64748B),
        type: BottomNavigationBarType.fixed,
        elevation: 10,
      ),
    );
  }
}
