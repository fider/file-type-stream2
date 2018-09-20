import { FileTypeStream2 } from "./FileTypeStream2";
import { DuplexOptions } from "stream";
import { FileTypeResult } from "file-type";



// For typings purposes
export { FileTypeStream2 };
export { DuplexOptions };
export { FileTypeResult };



// Exposed module interface
export function fileTypeStream(callback?: (fileTypeResult: FileTypeResult) => void, opts?: DuplexOptions): FileTypeStream2 {
    if (callback && typeof callback !== "function") {
        throw new Error(`fileTypeStream(callback?). Provided optional callback is not a function. Actual="${callback}"`);
    }

    return new FileTypeStream2(callback, opts);
}
