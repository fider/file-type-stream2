import * as index from "../../src";
import deepEqual from "deep-equal";



describe("index.ts", function() {


    describe("Detected unexpected module interface update", function() {

        let EXPECTED_PROTO: string[];
        let ACTUAL_PROTO: string[];


        beforeEach( function() {
            EXPECTED_PROTO = [
                "fileTypeStream",
                "FileTypeStream2",
                // DuplexOptions  - only TypeScript interfaca
                // FileTypeResult - only TypeScript interfaca
            ];

            ACTUAL_PROTO = Object.getOwnPropertyNames( index );
        });



        it(":", function() {

            let missing = EXPECTED_PROTO.filter( (property: string) => ( ! ACTUAL_PROTO.includes(property)) );

            missing = missing.filter( (property) => ( ! property.startsWith("__") ));
            if ( ! deepEqual(missing, [])) {
                fail(`Detected missing properties in module interface:\n - ${missing.join("\n -")}`);
            }
        });


        it(":", function() {

            let unknown = ACTUAL_PROTO.filter( (property: string) => ( ! EXPECTED_PROTO.includes(property)) );

            unknown = unknown.filter( (property) => ( ! property.startsWith("__") ));
            if ( ! deepEqual(unknown, [])) {
                fail(`Detected new unknown (not tested?) properties in module interface:\n - ${unknown.join("\n -")}`);
            }
        });
    });

});
