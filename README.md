
- [About](#about)
- [Installation & requirements](#installation-and-requirements)
- [Examples](#examples)
  - [Example with callback](#example-with-callback)
  - [Example with event](#example-with-event)
  - [Mixed example](#mixed-example)
  - [Detect only file type](#detect-only-file-type)
- [Documentation](#documentation)

# About:
- This module detects mime type of stream basing on it's content. If unable to detect it signals `"application/octet-stream"`. For detection it uses [file-type](https://www.npmjs.com/package/file-type) module.
- Improved (**and fixed**) version of (1)[file-type-stream](https://www.npmjs.com/package/file-type-stream) and (2)[stream-file-type](https://www.npmjs.com/package/stream-file-type) modules.
- Api consistent only with (1)[file-type-stream](https://www.npmjs.com/package/file-type-stream) so if you want to switch from (2)[stream-file-type](https://www.npmjs.com/package/stream-file-type) you need some small adaptations (check [examples](#examples) section).
- If you want just to detect file type (without reading whole file or piping stream) check [detect only file type](#detect-only-file-type) section below.

# Installation and requirements:
Requires [Node.js](https://nodejs.org/) v5.10.0
```sh
$ npm install file-type-stream2
```

# Examples:
Explanation of 'how it works' step by step (examples in next section):
```js
readableStream
  .pipe( fileTypeStream( (fileType) => {
    writableStream.fileType = fileType} ))
  .pipe(writableStream);
```
1. Pipe readable stream to FileTypeStream2 instance.
2. FileTypeStream2 will collect bytes until it will be able to recognize file type by it's content.
3. **IF** (received at leas 4100 bytes **OR** input stream ends) **AND** (still unable to detect file type) **THEN** (set `fileType = {ext: "", mime: "application/octet-stream"`).
4. When file type recognized
5. Signal file type by event or/and callback (details in example code below).
6. Pass through collected data and rest of incoming stream (start acting like PassThrough stream).

## Example with callback:
```js
import { fileTypeStream } from "file-type-stream2";
// const { fileTypeStream } from "file-type-stream2";

readStream
  .pipe( fileTypeStream( function(fileType) {
    writeStream.mime = fileType.mime;
    writeStream.ext = fileType.ext;
  }))
  .pipe(writeStream); // writeStream will NOT receive any data before file type recognized.
```

## Example with event:
```js
import { fileTypeStream } from "file-type-stream2";

let fts = fileTypeStream();

fts.onFileType( function(fileType) { // Equivalent of fts.on("fileType", function(fileType){...})
  writeStream.mime = fileType.mime;
  writeStream.ext = fileType.ext;
});

readStream
  .pipe( fts )
  .pipe( writeStream ); // writeStream will NOT receive any data before file type recognized.
```


## Mixed example:
```js
import { fileTypeStream } from "file-type-stream2";

let fts = fileTypeStream( function(fileType) {
  writeStream.mime = fileType.mime; // *This will be SECOND
  writeStream.ext = fileType.ext;
});

fts.onFileType( function(fileType) {
  writeStream.mime = fileType.mime; // *This will be FIRST
  writeStream.ext = fileType.ext;
});

readStream
  .pipe( fts )
  .pipe( writeStream ); // writeStream will NOT receive any data before file type recognized.
```


## Detect only file type:
If you want only detect file type basing on it's content then this example is for you.
You just have to use [file-type](https://www.npmjs.com/package/file-type) module:
```js
import fileType from "file-type";
// let fileType = require("file-type");

let first_4100_bytes_buffer = getFirstBytesSomehow(); // you can be less efficient and read whole file into buffer
let ft = fileType(first_4100_bytes_buffer);
ft = ft && ft.mime; // mime type string or null
```

# Documentation:

## function `fileTypeStream( callback?: (fileTypeResult: FileTypeResult) => void, opts?: DuplexOptions ): FileTypeStream2`
This function is exported directly from module.<br>It returns FileTypeStream2 instance that is native Duplex stream (details below).
  - Arg[0] `[callback] (fileTypeResult: {mime: string, ext: string}) => void`:<br>
    When mime type of file detected then `callback` will be called with proper `FileTypeResult` object (`{mime: string, ext: string}`).`FileTypeStream2::onFileType` also can be used to provide additonal `callback` - **in this case both callbacks would be called in preceding order: onFileType callback and then fileTypeStream callback**.
  - Arg[1] `[opts] DuplexOptions`:<br>
    Options for returned FileTypeStream2 object (instance of `Duplex` stream).<br>Do **NOT** set to `objectMode` because file type detection will not be possible (expect unhandled error).<br>Use only if you are aware of what you are doing (eg. set custom `hihgWaterMark`).

## class `FileTypeStream2` extends `Duplex` stream
Internal class returned by `fileTypeStream` function.
- #### `constructor( callback?: (fileTypeResult: FileTypeResult) => void, opts?: DupexOptions )`
  It is called internally by `fileTypeStream` function for you.
  - Arg[0] `[callback] (fileTypeResult: FileTypeResult) => void`:<br>
    When mime type of file detected then `callback` will be called with proper `fileTypeResult` object (`{mime: string, ext: string}`) (`onFileType` method also can be used to provide additonal `callback`).<br>
  - Arg[1] `[opts] DuplexOptions`:<br>
    Options for `Duplex` stream. Do **NOT** set to `objectMode` because file type detection will not be possible (expect unhandled error).Use only if you are aware of what you are doing (eg. set custom `hihgWaterMark`).
- #### `onFileType( callback: (fileTypeResult: FileTypeResult) => void )`<br>
  When mime type of file detected then `callback` will be called with proper `fileTypeResult` string. This method is equivalent of `on("fileType", callback)`.

## interface `FileTypeResult`
Interface returned from [file-type](https://www.npmjs.com/package/file-type) module.<br>Argument provided for your callbacks.
- #### `ext: string`
  File extension of specific mime type (if mime unknown then expect empty string `""` value).
- #### `mime: string`:
  Mime type of file (if mime unknown then expect `"application/octet-stream"` value).


![image](https://assets-cdn.github.com/images/modules/logos_page/GitHub-Mark.png)
