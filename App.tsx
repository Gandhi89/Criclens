import React, { useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BallTrackingScreen } from './src/ball-tracking/screens/BallTrackingScreen';
import { HomeScreen } from './src/ball-tracking/screens/HomeScreen';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [showTracking, setShowTracking] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {showTracking ? (
          <BallTrackingScreen onBack={() => setShowTracking(false)} />
        ) : (
          <HomeScreen onStartTracking={() => setShowTracking(true)} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
