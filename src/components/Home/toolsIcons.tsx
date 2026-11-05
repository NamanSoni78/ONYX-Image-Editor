import {
  FaCrop, FaSliders, FaWandMagicSparkles, FaFont, FaShapes, FaPen, FaFaceSmile,
  FaMask, FaLayerGroup, FaFileImage, FaPlug,
} from 'react-icons/fa6';

/** Icon map for tool cards (keys match ToolInfo.icon in lib/features.ts) */
export const TOOLS: Record<string, React.ComponentType<{ size?: number }>> = {
  crop: FaCrop,
  resize: FaCrop,
  filter: FaWandMagicSparkles,
  adjust: FaSliders,
  text: FaFont,
  shape: FaShapes,
  draw: FaPen,
  sticker: FaFaceSmile,
  mask: FaMask,
  layers: FaLayerGroup,
  convert: FaFileImage,
  offline: FaPlug,
};
