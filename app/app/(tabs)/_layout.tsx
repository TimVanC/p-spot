import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  label: string;
  icon: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'index', label: 'Home', icon: 'map-outline' },
  { name: 'stream', label: 'Stream', icon: 'water-outline' },
  { name: 'submit', label: 'Submit', icon: 'camera-outline' },
  { name: 'leaderboard', label: 'Board', icon: 'trophy-outline' },
  { name: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: 'rgba(0,0,0,0.08)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#B89A2E',
        tabBarInactiveTintColor: '#999999',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
