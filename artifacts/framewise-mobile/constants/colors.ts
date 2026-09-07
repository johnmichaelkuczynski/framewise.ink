/**
 * FrameWise brand color tokens — derived from the web app's index.css.
 *
 * Primary palette: rose pink (#D91E5A) on dark navy for the intelligence-agency
 * aesthetic used throughout the product.
 */

const colors = {
  light: {
    text: '#1E2333',
    tint: '#D91E5A',
    background: '#FDFDFD',
    foreground: '#1E2333',
    card: '#FFFFFF',
    cardForeground: '#1E2333',
    primary: '#D91E5A',
    primaryForeground: '#FFFFFF',
    secondary: '#F4E5EC',
    secondaryForeground: '#7D2438',
    muted: '#EFF1F5',
    mutedForeground: '#67728E',
    accent: '#F4E5EC',
    accentForeground: '#7D2438',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    border: '#D8DCEC',
    input: '#EDF0F5',
  },
  dark: {
    text: '#EEF0F7',
    tint: '#D91E5A',
    background: '#0D0F15',
    foreground: '#EEF0F7',
    card: '#111420',
    cardForeground: '#EEF0F7',
    primary: '#D91E5A',
    primaryForeground: '#FFFFFF',
    secondary: '#1A0D14',
    secondaryForeground: '#F07898',
    muted: '#141720',
    mutedForeground: '#7880A0',
    accent: '#1A0D14',
    accentForeground: '#F07898',
    destructive: '#C41E3A',
    destructiveForeground: '#FFFFFF',
    border: '#1E2235',
    input: '#1A1D2E',
  },
  // Border radius in px — matches web app's --radius: 0.625rem (10px)
  radius: 10,
};

export default colors;
