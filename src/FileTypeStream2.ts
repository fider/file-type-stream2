import { Buffer } from "buffer";
import { Duplex } from "stream";
import fileType from "file-type";



// ==================== Internal ==================

const MAX_BYTES_TO_DETECT_MIME = 4100;

const MIME_DETECTION_STATE = Symbol("detectionMode");
const PASS_THROUGH_STATE = Symbol("passThroughMode");



export class FileTypeStream2 extends Duplex {

    private _dataBuffer: Buffer;
    private _reading = false;
    private _readSize = 0;
    private _mimeTypeCallback: ((mimeType: string) => void) | undefined;
    private _state: Symbol;
    private _finalCalled = false;
    private _EOFSent = false;



    constructor(callback?: (mimeType: string) => void) {
        super();
        this._dataBuffer = new Buffer(0);

        if (callback && typeof callback !== "function") {
            throw new Error(`FileTypeStream constructor error. Provided optional callback is not a function. Actual="${callback}"`);
        }
        this._mimeTypeCallback = callback;

        this._state = MIME_DETECTION_STATE;
    }



    public onMimeType(callback: (mimeType: string) => void) {
        if (typeof callback !== "function") {
            throw new Error(`FileTypeStream.onMimeType(callback): callback="${typeof callback}" is not a function.`);
        }
        this.on("mimeType", callback);
    }



    _signalMimeDetected(mime: string) {

        this._state = PASS_THROUGH_STATE;

        this.emit("mimeType", mime);

        if (this._mimeTypeCallback) {
            this._mimeTypeCallback(mime);
        }

        this._passThroughData();
    }



    _write(chunk: Buffer | string, encoding: string | undefined, callback: (error?: Error) => void) {

        if (typeof chunk === "string") {
            chunk = Buffer.from(chunk, encoding);
        }

        let length = this._dataBuffer.length + chunk.length;
        this._dataBuffer = Buffer.concat([this._dataBuffer, chunk], length);


        if (this._state === PASS_THROUGH_STATE) {
            this._passThroughData();

        }
        else if (this._state === MIME_DETECTION_STATE) {

            let mime = getMime(this._dataBuffer);

            if (mime) {
                this._signalMimeDetected(mime); // this._state = PASS_THROUGH_STATE;
            }
            else { // mime not yet detected
                if (this._dataBuffer.length >= MAX_BYTES_TO_DETECT_MIME) {
                    this._signalMimeDetected("application/octet-stream"); // this._state = PASS_THROUGH_STATE;
                }
                else {
                    // do nothing - keep collect data and try to detect mime
                }
            }

        }
        else {
            this.emit("error", new Error(`Internal FileTypeStream error - unextected _state: "${this._state}".`));
        }


        callback();
    }



    // Called after last "write"
    _final(callback: Function) {
        this._finalCalled = true;

        // IF  mime still not detected  &&  _final call means no more input and that all input is processed
        if (this._state !== PASS_THROUGH_STATE) {
            this._signalMimeDetected("application/octet-stream");
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

        let size = this._readSize;
        let dataToPush;

        while(this._reading && this._dataBuffer.length) {
            if (size && this._dataBuffer.length > size) {
                dataToPush = this._dataBuffer.slice(0, size);
                this._dataBuffer = this._dataBuffer.slice(size);
            }
            else {
                dataToPush = this._dataBuffer;
                this._dataBuffer = new Buffer(0);
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
function getMime(buffer: Buffer) {
    let ft = fileType(buffer);
    return ft && ft.mime;
}
