import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const JSON_MIME_TYPE = "application/json";

interface BrowserDownloadAnchor {
  download: string;
  href: string;
  click: () => void;
  remove: () => void;
}

interface BrowserGlobals {
  Blob: new (parts: string[], options: { type: string }) => unknown;
  URL: {
    createObjectURL: (value: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
  document: {
    body: {
      appendChild: (element: BrowserDownloadAnchor) => void;
    };
    createElement: (tag: "a") => BrowserDownloadAnchor;
  };
}

const downloadWebFile = (contents: string, fileName: string) => {
  const browser = globalThis as unknown as BrowserGlobals;
  const file = new browser.Blob([contents], { type: JSON_MIME_TYPE });
  const fileUrl = browser.URL.createObjectURL(file);
  const anchor = browser.document.createElement("a");

  anchor.href = fileUrl;
  anchor.download = fileName;
  browser.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => browser.URL.revokeObjectURL(fileUrl), 0);
};

export const downloadBackupFile = async (
  contents: string,
  fileName: string,
) => {
  if (Platform.OS === "web") {
    downloadWebFile(contents, fileName);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device.");
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(contents);

  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Backup Activity Log Data",
    mimeType: JSON_MIME_TYPE,
    UTI: "public.json",
  });
};

export const pickBackupFileContents = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: JSON_MIME_TYPE,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  if (Platform.OS === "web") {
    if (asset.file) return asset.file.text();

    const response = await fetch(asset.uri);
    return response.text();
  }

  return new File(asset.uri).text();
};
