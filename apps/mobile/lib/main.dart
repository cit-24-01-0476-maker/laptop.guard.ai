import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'screens/home_screen.dart';
import 'screens/map_screen.dart';
import 'screens/devices_screen.dart';
import 'screens/alerts_screen.dart';
import 'screens/profile_screen.dart';

void main() {
  runApp(const LaptopGuardMobileApp());
}

class LaptopGuardMobileApp extends StatelessWidget {
  const LaptopGuardMobileApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LaptopGuard AI',
      debugShowCheckedModeBanner: false,
      theme: GuardTheme.darkTheme,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({Key? key}) : super(key: key);

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    MapScreen(),
    DevicesScreen(),
    AlertsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), activeIcon: Icon(Icons.map), label: 'Map'),
          BottomNavigationBarItem(icon: Icon(Icons.laptop_outlined), activeIcon: Icon(Icons.laptop), label: 'Devices'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'Alerts'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
