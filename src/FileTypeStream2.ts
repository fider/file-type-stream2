import { Buffer } from "buffer";
import { Duplex, DuplexOptions } from "stream";
import { FileTypeResult } from "file-type";
import fileType from "file-type";



// ==================== Internal ==================

const MAX_BYTES_TO_DETECT_MIME = 4100;

const MIME_DETECTION_STATE = Symbol("detectionMode");
const PASS_THROUGH_STATE = Symbol("passThroughMode");



export class FileTypeStream2 extends Duplex {

    private _dataBuffer: Buffer;
    private _reading = false;
    private _readSize = 0;
    private _fileTypeCallback: ((fileTypeResult: FileTypeResult) => void) | undefined;
    private _state: symbol;
    private _finalCalled = false;
    private _EOFSent = false;


    constructor(callback?: (fileTypeResult: FileTypeResult) => void, opts?: DuplexOptions) {
        super(opts);
        this._dataBuffer = Buffer.from([]);

        if (callback && typeof callback !== "function") {
            throw new Error(`FileTypeStream constructor error. Provided optional callback is not a function. Actual="${callback}"`);
        }
        this._fileTypeCallback = callback;

        this._state = "X" as any;
    }



    onFileType(callback: (fileTypeResult: fileType.FileTypeResult) => void) {
        if (typeof callback !== "function") {
            throw new Error(`FileTypeStream.onFileType(callback): callback="${typeof callback}" is not a function.`);
        }
        this.on("fileType", callback);
    }



    _signalMimeDetected(fileTypeResult: FileTypeResult) {

        this._state = PASS_THROUGH_STATE;

        this.emit("fileType", fileTypeResult);

        if (this._fileTypeCallback) {
            this._fileTypeCallback(fileTypeResult);
        }

        this._passThroughData();
    }



    _write(chunk: Buffer | string, encoding: string | undefined, callback: (error?: Error) => void) {

        if (typeof chunk === "string") {
            chunk = Buffer.from(chunk, encoding);
        }

        const length = this._dataBuffer.length + chunk.length;
        this._dataBuffer = Buffer.concat([this._dataBuffer, chunk], length);


        if (this._state === PASS_THROUGH_STATE) {
            this._passThroughData();

        }
        else if (this._state === MIME_DETECTION_STATE) {

            const ftr = tryToGetFileType(this._dataBuffer);

            if (ftr) {
                this._signalMimeDetected(ftr); // this._state = PASS_THROUGH_STATE;
            }
            else { // mime not yet detected
                if (this._dataBuffer.length >= MAX_BYTES_TO_DETECT_MIME) {
                    this._signalMimeDetected({ // this._state = PASS_THROUGH_STATE;
                        ext: "",
                        mime: "application/octet-stream",
                    });
                }
                else {
                    // do nothing - keep collect data and try to detect mime
                }
            }

        }
        else {
            this.emit("error", new Error(`Internal FileTypeStream error - unextected _state: "${this._state.toString()}".`));
        }


        callback();
    }



    // Called after last "write"
    _final(callback: () => void) {
        this._finalCalled = true;

        // IF  mime still not detected  &&  _final call means no more input and that all input is processed
        if (this._state !== PASS_THROUGH_STATE) {
            this._signalMimeDetected({ // this._state = PASS_THROUGH_STATE;
                ext: "",
                mime: "application/octet-stream",
            });
        }

        // IF  end of output stream not sent  &&  no more data do send  &&  _final call means no more input and that all input is processed
        if ( ( ! this._EOFSent) && this._dataBuffer.length === 0) {
            this._EOFSent = true;
            this.push(null); // To be consistend with stream api
        }

        // write stream closes here
        callback();
    }



    _read(size = 0) {
        this._reading = true;
        this._readSize = size;
        this._passThroughData();
    }



    _passThroughData() {

        const size = this._readSize;
        let dataToPush;

        while (this._reading && this._dataBuffer.length) {
            if (size && this._dataBuffer.length > size) {
                dataToPush = this._dataBuffer.slice(0, size);
                this._dataBuffer = this._dataBuffer.slice(size);
            }
            else {
                dataToPush = this._dataBuffer;
                this._dataBuffer = Buffer.from([]);
            }

            if (dataToPush.length) {
                this._reading = this.push(dataToPush);
            }
        }

        // IF  end of input stream signaled  &&  end of output stream not sent  &&  no more data to send
        if (this._finalCalled  &&  ( ! this._EOFSent)  &&   this._dataBuffer.length === 0) {
            this._EOFSent = true;
            this.push(null);
        }
    }

}



// ==================== Helpers ==================
function tryToGetFileType(buffer: Buffer): FileTypeResult | null {
    const fileTypeResult = fileType(buffer);
    return fileTypeResult || null;
}
