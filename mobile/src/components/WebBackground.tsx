import { Image, StyleSheet } from 'react-native';

export function WebBackground() {
  return (
    <Image
      source={require('../../assets/dong-son-background.png')}
      resizeMode="cover"
      pointerEvents="none"
      accessible={false}
      style={styles.image}
    />
  );
}

const styles = StyleSheet.create({
  image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.2 },
});
