import { styled } from "@mui/material";

interface TextProps {
  fontSize?: string;
  color?: string;
  fontWeight?: number;
}

const Text = styled("p")<TextProps>(
  ({ theme, fontSize, color, fontWeight }) => ({
    fontSize: fontSize || theme.fontSize.text14,
    color: color || theme.fontColor.main,
    fontWeight: fontWeight,
  })
);

export default Text;
