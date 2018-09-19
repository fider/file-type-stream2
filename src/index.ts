import { FileTypeStream2 } from "./FileTypeStream2";



// Exposed module interface
export function fileTypeStream(callback?: (mimeType: string) => void): FileTypeStream2 {
    if (callback && typeof callback !== "function") {
        throw new Error(`fileTypeStream(callback?). Provided optional callback is not a function. Actual="${callback}"`);
    }

    return new FileTypeStream2(callback);
}