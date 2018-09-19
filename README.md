
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
Requires [Node.js](https://nodejs.org/) vX.X.X TODO
```sh
$ npm install file-type-stream2
```

# Examples:
Explanation of 'how it works' step by step:
```js
readableStream.pipe( fileTypeStream( (mime) => {writableStream.mime = mime} )).pipe(writableStream);
```
1. Pipe readable stream to FileTypeStream2 instance.
2. FileTypeStream2 will collect bytes until it will be able to recognize file type by it's content.
3. **IF** (received at leas 4100 bytes **OR** input stream ends) **AND** (still unable to detect file type) **THEN** (set `"application/octet-stream"` file type).
4. When file type recognized
5. Signal mime type by event or/and callback (details in example code below).
6. Pass through collected data and rest of incoming stream (start acting like PassThrough stream).

## Example with callback:
```js
import { fileTypeStream } from "file-type-stream2";
// const { fileTypeStream } from "file-type-stream2";

readStream
  .pipe( fileTypeStream( function(mime) {
    writeStream.mime = mime;
  }))
  .pipe(writeStream); // writeStream will NOT receive any data before mime type recognized.
```

## Example with event:
```js
import { fileTypeStream } from "file-type-stream2";

let fts = fileTypeStream();

fts.onMimeType( function(mime) { // Equivalent of fts.on("mimeType", function(mime){...})
  writeStream.mime = mime;
});

readStream
  .pipe( fts )
  .pipe( writeStream ); // writeStream will NOT receive any data before mime type recognized.
```


## Mixed example:
```js
import { fileTypeStream } from "file-type-stream2";

let fts = fileTypeStream( function(mime) {
  writeStream.mime = mime; // *This will be SECOND
});

fts.onMimeType( function(mime) {
  writeStream.mime = mime; // *This will be FIRST
});

readStream
  .pipe( fts )
  .pipe( writeStream ); // writeStream will NOT receive any data before mime type recognized.
```


## Detect only file type:
If you want only detect file type basing on it's content then this example is for you.
You just have to use [file-type](https://www.npmjs.com/package/file-type) module:
```js
import fileType from "file-type"; // alternatively `let fileType = require("file-type");`
let first_4100_bytes_buffer = getFirstBytesSomehow(); // you can be less efficient and read whole file into buffer
let ft = fileType(first_4100_bytes_buffer);
ft = ft && ft.mime; // mime type string or null
```

# Documentation:

## function `fileTypeStream( callback?: (mimeType: string) => void ): FileTypeStream2`
### this function returns FileTypeStream2 instance (details below)

## class `FileTypeStream2`
- ### `constructor( callback?: (mimeType: string) => void )`<br>- when mime type of file detected then `callback` will be called with proper `mimeType` string.
- ### `onMimeType( callback: (mimeType: string) => void )`<br>- when mime type of file detected then `callback` will be called with proper `mimeType` string. This method is equivalent of `on("mimeType", callback)`.


![image](https://assets-cdn.github.com/images/modules/logos_page/GitHub-Mark.png)
