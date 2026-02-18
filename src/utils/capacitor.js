import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';

// Check if running on native platform
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';

// Initialize Capacitor plugins
export const initCapacitor = async () => {
  if (!isNative()) return;

  try {
    // Hide splash screen after app loads
    await SplashScreen.hide({
      fadeOutDuration: 300,
    });

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Light });
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#3B82F6' });
    }

    // Setup keyboard listeners for better UX
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });

    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

  } catch (error) {
    console.log('Capacitor initialization error:', error);
  }
};

// Haptic feedback functions
export const hapticLight = async () => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Haptics not available
  }
};

export const hapticMedium = async () => {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    // Haptics not available
  }
};

export const hapticSuccess = async () => {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    // Haptics not available
  }
};

export const hapticError = async () => {
  if (!isNative()) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch (e) {
    // Haptics not available
  }
};

// Status bar utilities
export const setStatusBarLight = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch (e) {
    // StatusBar not available
  }
};

export const setStatusBarDark = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (e) {
    // StatusBar not available
  }
};

export const hideStatusBar = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.hide();
  } catch (e) {
    // StatusBar not available
  }
};

export const showStatusBar = async () => {
  if (!isNative()) return;
  try {
    await StatusBar.show();
  } catch (e) {
    // StatusBar not available
  }
};
