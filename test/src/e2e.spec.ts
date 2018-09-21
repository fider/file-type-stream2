import { fileTypeStream, FileTypeResult, FileTypeStream2 } from "../../src";
import { Readable, Transform, Writable, TransformCallback } from "stream";
import { createReadStream, readFileSync } from "fs";
import * as path from "path";

describe("E2E (End To End) test of FileTypeStream2 module.", function() {

    let input: Readable;
    let fts: FileTypeStream2;
    let fileTypeResult: FileTypeResult | undefined = undefined;
    let processor: Transform & {fileType?: FileTypeResult};
    let output: Writable;
    let result: Buffer;


    describe("Should detect specific file format.", async function() {

        let fileTypeCallbackSpy: jasmine.Spy | undefined;
        let fileTypeEventSpy: jasmine.Spy | undefined;

        beforeEach(function() {
        });


        const inputData = [
            {file: "testFile.bin", expectedMime: "application/octet-stream", expectedExt: ""},
            // {file: "testFile.rtf", expectedMime: "application/rtf", expectedExt: "rtf"},
            // {file: "testFile.png", expectedMime: "image/png", expectedExt: "png"},
            // {file: "testFile.jpeg", expectedMime: "image/jpeg", expectedExt: "jpg"},
        ];

        inputData.forEach( (DATA) => {
            let data = DATA; // Need closure variable;

            function testCaseThatRequireFileTypeStream(done: DoneFn) {
                //
                // Input
                //
                let filePath = path.join(__dirname, "../exampleFiles", data.file);
                input = createReadStream( filePath );

                processor = new Transform({
                    transform: function(chunk: any, _encoding: string, callback: TransformCallback) {
                        if ( ! (fileTypeResult && fileTypeResult.mime)) {
                            fail(`Expected that fileType will be determined before first chunk of data will get to "processor" stream.`);
                        }
                        callback(undefined, chunk);
                    }
                });

                result = Buffer.from([]);
                output = new Writable({
                    write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
                        let length = result.length + chunk.length;
                        result = Buffer.concat([result, chunk], length);
                        callback();
                    }
                });


                //
                // Test
                //
                input
                    .pipe(fts)
                    .pipe(processor)
                    .pipe(output);


                //
                // Verify
                //
                output.on("finish", function verifyResult() {
                    let expectedResult = readFileSync(filePath);
                    if (result.toString() !== expectedResult.toString()) {
                        fail(`Processed stream malformed.\nResult="${result.toString().substr(0, 10)}..."\nExpectedResult="${expectedResult.toString().substr(0, 10)}..."`);
                    }

                    expect(data.expectedExt).toBe((fileTypeResult as FileTypeResult).ext);
                    expect(data.expectedMime).toBe((fileTypeResult as FileTypeResult).mime);

                    if ( ! (fileTypeCallbackSpy || fileTypeEventSpy)) {
                        fail(`Invalid test case - expected that at least one listener for file type result`);
                    }
                    if (fileTypeCallbackSpy) {
                        expect(fileTypeCallbackSpy).toHaveBeenCalledTimes(1);
                        expect(fileTypeCallbackSpy).toHaveBeenCalledWith({ext: data.expectedExt, mime: data.expectedMime});
                    }
                    if (fileTypeEventSpy) {
                        expect(fileTypeEventSpy).toHaveBeenCalledTimes(1);
                        expect(fileTypeEventSpy).toHaveBeenCalledWith({ext: data.expectedExt, mime: data.expectedMime});
                    }


                    done();
                });
            }


            it(`Should properly detect file="${data.file}", mime="${data.expectedMime}", ext="${data.expectedExt}" using fileTypeStream(callback) style`, async function(done: DoneFn) {

                fileTypeCallbackSpy = jasmine.createSpy("fileTypeCallbackSpy", (fileType: FileTypeResult): void => {
                    fileTypeResult = fileType;
                }).and.callThrough();

                fileTypeEventSpy = undefined;


                fts = fileTypeStream( fileTypeCallbackSpy );

                testCaseThatRequireFileTypeStream(done);
            });



            it(`Should properly detect file="${data.file}", mime="${data.expectedMime}", ext="${data.expectedExt}" using FileTypeStream2::onFileType(callback) style`, async function(done: DoneFn) {

                fileTypeCallbackSpy = undefined;

                fileTypeEventSpy = jasmine.createSpy("fileTypeEventSpy", (fileType: FileTypeResult): void => {
                    fileTypeResult = fileType;
                }).and.callThrough();


                fts = fileTypeStream();
                fts.onFileType( fileTypeEventSpy );


                testCaseThatRequireFileTypeStream(done);
            });



            it(`Should properly detect file="${data.file}", mime="${data.expectedMime}", ext="${data.expectedExt}" using both callbacks styles:`
             + `- fileTypeStream(callback)  and  FileTypeStream2::onFileType(callback)`, async function(done: DoneFn) {

                fileTypeCallbackSpy = jasmine.createSpy("fileTypeCallbackSpy", (fileType: FileTypeResult): void => {
                    fileTypeResult = fileType;
                }).and.callThrough();

                fileTypeEventSpy = jasmine.createSpy("fileTypeEventSpy", (fileType: FileTypeResult): void => {
                    fileTypeResult = fileType;
                }).and.callThrough();


                fts = fileTypeStream( fileTypeCallbackSpy );
                fts.onFileType( fileTypeEventSpy );


                testCaseThatRequireFileTypeStream(done);
            });
        })

    });



    it(`When using both:  1) "fileTypeStream(callback)"  and  2) "FileTypeStream2::onFileType(callback)"  then callbacks should be called in correct order.`, async function(done: DoneFn) {

        //
        // Input
        //
        let filePath = path.join(__dirname, "../exampleFiles/testFile.png");
        input = createReadStream( filePath );

        output = new Writable({
            write(_chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
                // Reuslt not verified in this test case
                callback();
            }
        });


        let fileTypeCallbackSpy = jasmine.createSpy("fileTypeCallbackSpy", (fileType: FileTypeResult): void => {
            fileTypeResult = fileType;
        }).and.callThrough();

        let fileTypeEventSpy = jasmine.createSpy("fileTypeEventSpy", (fileType: FileTypeResult): void => {
            fileTypeResult = fileType;
        }).and.callThrough();


        //
        // Test
        //
        fts = fileTypeStream( fileTypeCallbackSpy );
        fts.onFileType( fileTypeEventSpy );

        input.pipe(fts).pipe(output);


        //
        // Verify
        //
        output.on("finish", function verifyTestCase() {
            expect(fileTypeCallbackSpy).toHaveBeenCalledTimes(1);
            expect(fileTypeCallbackSpy).toHaveBeenCalledWith({ext: "png", mime: "image/png"});

            expect(fileTypeEventSpy).toHaveBeenCalledTimes(1);
            expect(fileTypeEventSpy).toHaveBeenCalledWith({ext: "png", mime: "image/png"});

            expect(fileTypeEventSpy).toHaveBeenCalledBefore(fileTypeCallbackSpy);

            done();
        });
    });


    it(`Should process chunks in expected (async) order adapted to highWaterMark of input`, async function(done: DoneFn) {
        let outputChunks: Buffer[] = [];


        //
        // Input
        //
        let filePath = path.join(__dirname, "../exampleFiles/testFile.rtf");
        input = createReadStream( filePath, {
            highWaterMark: 2
        });

        output = new Writable({
            write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
                outputChunks.push(chunk);
                callback();
            }
        });


        let fileTypeCallbackSpy = jasmine.createSpy("fileTypeCallbackSpy", (fileType: FileTypeResult): void => {
            fileTypeResult = fileType;
        }).and.callThrough();


        //
        // Test
        //
        fts = fileTypeStream( fileTypeCallbackSpy );

        input.pipe(fts).pipe(output);


        //
        // Verify
        //
        output.on("finish", function verifyTestCase() {

            for (let [index, chunk] of outputChunks.entries()) {
                if (index === 0) { // First chunk
                    if (chunk.length !== 6) {
                        fail(`Invalid chunk length=${chunk.length}. Expected length=6. Chunk index=${index}.`);
                    }
                }
                else if (index === 93) { // Last chunk
                    if (chunk.length !== 1) {
                        fail(`Invalid chunk length=${chunk.length}. Expected length=2. Chunk index=${index}.`);
                    }
                }
                else {
                    if (chunk.length !== 2) {
                        fail(`Invalid chunk length=${chunk.length}. Expected length=2. Chunk index=${index}.`);
                    }
                }
            }

            done();
        });
    });

});
