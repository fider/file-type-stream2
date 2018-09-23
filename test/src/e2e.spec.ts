import { fileTypeStream, FileTypeResult, FileTypeStream2 } from "../../src";
import { Readable, Transform, Writable, TransformCallback, Stream } from "stream";
import { createReadStream, readFileSync } from "fs";
import * as path from "path";

describe("E2E (End To End) test of FileTypeStream2 module.", function() {

    let input: Readable;
    let fts: FileTypeStream2;
    let fileTypeResult: FileTypeResult | undefined;
    let processor: Transform & {fileType?: FileTypeResult};
    let streamAfter: Writable;
    let result: Buffer;


    describe("Should detect specific file format.", async function() {

        let fileTypeCallbackSpy: jasmine.Spy | undefined;
        let fileTypeEventSpy: jasmine.Spy | undefined;

        beforeEach(function() {
            // do nothing
        });


        const inputData = [
            {file: "testFile.bin", expectedMime: "application/octet-stream", expectedExt: ""},
            // {file: "testFile.rtf", expectedMime: "application/rtf", expectedExt: "rtf"},
            // {file: "testFile.png", expectedMime: "image/png", expectedExt: "png"},
            // {file: "testFile.jpeg", expectedMime: "image/jpeg", expectedExt: "jpg"},
        ];

        inputData.forEach( (DATA) => {
            const data = DATA; // Need closure variable;

            function testCaseThatRequireFileTypeStream(done: DoneFn) {
                //
                // Input
                //
                const filePath = path.join(__dirname, "../exampleFiles", data.file);
                input = createReadStream( filePath );

                processor = new Transform({
                    transform(chunk: any, _encoding: string, callback: TransformCallback) {
                        if ( ! (fileTypeResult && fileTypeResult.mime)) {
                            fail(`Expected that fileType will be determined before first chunk of data will get to "processor" stream.`);
                        }
                        callback(undefined, chunk);
                    }
                });

                result = Buffer.from([]);
                streamAfter = new Writable({
                    write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
                        const length = result.length + chunk.length;
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
                    .pipe(streamAfter);


                //
                // Verify
                //
                streamAfter.on("finish", function verifyResult() {
                    const expectedResult = readFileSync(filePath);
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
        });

    });



    it(`When using both:  1) "fileTypeStream(callback)"  and  2) "FileTypeStream2::onFileType(callback)"  then callbacks should be called in correct order.`, async function(done: DoneFn) {

        //
        // Input
        //
        const filePath = path.join(__dirname, "../exampleFiles/testFile.png");
        input = createReadStream( filePath );

        streamAfter = new Writable({
            write(_chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
                // Reuslt not verified in this test case
                callback();
            }
        });


        const fileTypeCallbackSpy = jasmine.createSpy("fileTypeCallbackSpy", (fileType: FileTypeResult): void => {
            fileTypeResult = fileType;
        }).and.callThrough();

        const fileTypeEventSpy = jasmine.createSpy("fileTypeEventSpy", (fileType: FileTypeResult): void => {
            fileTypeResult = fileType;
        }).and.callThrough();


        //
        // Test
        //
        fts = fileTypeStream( fileTypeCallbackSpy );
        fts.onFileType( fileTypeEventSpy );

        input.pipe(fts).pipe(streamAfter);


        //
        // Verify
        //
        streamAfter.on("finish", function verifyTestCase() {
            expect(fileTypeCallbackSpy).toHaveBeenCalledTimes(1);
            expect(fileTypeCallbackSpy).toHaveBeenCalledWith({ext: "png", mime: "image/png"});

            expect(fileTypeEventSpy).toHaveBeenCalledTimes(1);
            expect(fileTypeEventSpy).toHaveBeenCalledWith({ext: "png", mime: "image/png"});

            expect(fileTypeEventSpy).toHaveBeenCalledBefore(fileTypeCallbackSpy);

            done();
        });
    });


    const inputFilePath = path.join(__dirname, "../exampleFiles/testFile.rtf");
    it(`Should process chunks in expected (async) order adapted to highWaterMark of input.\n`
     + `This test case strongly depends on used test file and currently it is adapted to file: ${inputFilePath}`, async function(done: DoneFn) {
        const dataFlow: Array<{source: Stream, data: Buffer}> = [];


        //
        // Input
        //
        input = createReadStream( inputFilePath, {
            highWaterMark: 2
        });

        const streamBefore = new Transform({
            transform(chunk: any, encoding: string, callback: TransformCallback) {
                dataFlow.push({source: this, data: Buffer.from(chunk)});
                callback(undefined, chunk);
            },
        });

        streamAfter = new Writable({
            write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
                dataFlow.push({source: this, data: Buffer.from(chunk)});
                callback();
            }
        });


        const fileTypeCallbackSpy = jasmine.createSpy("fileTypeCallbackSpy", (fileType: FileTypeResult): void => {
            fileTypeResult = fileType;
        }).and.callThrough();



        //
        // Test
        //
        fts = fileTypeStream( fileTypeCallbackSpy );

        input
            .pipe(streamBefore)
            .pipe(fts)
            .pipe(streamAfter);


        //
        // Verify
        //
        streamAfter.on("finish", function verifyTestCase() {

            for (const [index, {source, data}] of dataFlow.entries()) {
                // Step 1)  First 3 input chunks
                if (index >= 0 && index <= 2) {
                    if ( ! (source === streamBefore && data.length === 2)) {
                        fail(`Invalid chunk isSourceOk=${source === streamBefore}. Length Expected=2, Actual=${data.length}. Chunk index=${index}.`);
                    }
                }
                // Step 2)  Chunk no. 4 (summary length of first 3 chunks)
                else if (index === 3) {
                    if ( ! (source === streamAfter && data.length === 6)) {
                        fail(`Invalid chunk isSourceOk=${source === streamAfter}. Length Expected=2, Actual=${data.length}. Chunk index=${index}.`);
                    }
                }
                // Even
                else if (index % 2 === 0) {
                    let expectedLength = 2;

                    // IF last input chunk
                    if (index === 188) {
                        expectedLength = 1;
                    }

                    if ( ! (source === streamBefore && data.length === expectedLength)) {
                        fail(`Invalid chunk isSourceOk=${source === streamBefore}. Length Expected=${expectedLength}, Actual=${data.length}. Chunk index=${index}.`);
                    }
                }
                // Odd
                else {
                    let expectedLength = 2;

                    // IF last output chunk
                    if ( index === 189 ) {
                        expectedLength = 1;
                    }

                    if ( ! (source === streamAfter && data.length === expectedLength)) {
                        fail(`Last chunk invalid. isSourceOk=${source === streamAfter}. Length Expected=${expectedLength}, Actual=${data.length}. Chunk index=${index}.`);
                    }
                }
            }

            done();
        });
    });

});
