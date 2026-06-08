import { Image, StyleSheet, View, type ImageResizeMode, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";

const cartoLogoSource = require("../../assets/Carto_logo.png");

interface CartoLogoProps {
  height: number;
  radius?: number;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ViewStyle>;
  width: number;
}

export function CartoLogo({
  height,
  radius = 18,
  resizeMode = "cover",
  style,
  width
}: CartoLogoProps) {
  return (
    <View style={[styles.frame, { borderRadius: radius, height, width }, style]}>
      <Image
        accessibilityLabel="Carto logo"
        accessibilityRole="image"
        alt="Carto logo"
        resizeMode={resizeMode}
        source={cartoLogoSource}
        style={[styles.image, { borderRadius: radius }] as StyleProp<ImageStyle>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%"
  }
});
