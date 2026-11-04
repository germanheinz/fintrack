import { groupLinesIntoRows } from './groupLines';

export class OcrUnavailableError extends Error {}

// The native module exists only in a development build, not in Expo Go.
function loadTextRecognition() {
  try {
    const module = require('@react-native-ml-kit/text-recognition');
    const recognizer = module.default || module;
    if (!recognizer?.recognize) throw new Error('missing recognize');
    return recognizer;
  } catch {
    throw new OcrUnavailableError('On-device OCR needs the development build (not Expo Go).');
  }
}

export async function recognizeRows(imageUri) {
  const recognizer = loadTextRecognition();
  let result;
  try {
    result = await recognizer.recognize(imageUri);
  } catch (e) {
    throw new OcrUnavailableError(`OCR failed: ${e.message}. Expo Go has no OCR module; use the development build.`);
  }
  const lines = (result.blocks || []).flatMap((block) => block.lines || []);
  return groupLinesIntoRows(lines);
}
