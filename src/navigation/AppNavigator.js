import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RoomSetupScreen from '../screens/RoomSetupScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import WaitingRoomScreen from '../screens/WaitingRoomScreen';
import RoleRevealScreen from '../screens/RoleRevealScreen';
import TaggerCameraScreen from '../screens/TaggerCameraScreen';
import RunnerWaitingScreen from '../screens/RunnerWaitingScreen';
import CaughtScreen from '../screens/CaughtScreen';
import ResultScreen from '../screens/ResultScreen';
import BehindTheScenesScreen from '../screens/BehindTheScenesScreen';

const Stack = createNativeStackNavigator();

// 전체 화면 흐름
// Login -> Home -> [RoomSetup | JoinRoom] -> WaitingRoom
// -> RoleReveal -> TaggerCamera -> (반복) -> Result -> BehindTheScenes
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />

        <Stack.Screen name="RoomSetup" component={RoomSetupScreen} />
        <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
        <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
        <Stack.Screen name="RoleReveal" component={RoleRevealScreen} />
        <Stack.Screen name="RunnerWaiting" component={RunnerWaitingScreen} />
        <Stack.Screen name="Caught" component={CaughtScreen} />
        <Stack.Screen name="TaggerCamera" component={TaggerCameraScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="BehindTheScenes" component={BehindTheScenesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
