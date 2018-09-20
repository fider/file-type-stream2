import { FileTypeStream2 } from "../../src/FileTypeStream2";
import deepEqual from "deep-equal";
import { Duplex } from "stream";



describe("FileTypeStream2 intercafe.", function() {


    describe("Unexpected module interface update.", function() {

        let EXPECTED_PROTO: string[];
        let ACTUAL_PROTO: string[];


        beforeEach( function() {
            const fts2 = new FileTypeStream2();

            EXPECTED_PROTO = [
                "constructor",
                "onFileType",
            ]
            .concat(Object.getOwnPropertyNames( new Duplex() ));

            ACTUAL_PROTO = ([] as string[])
                .concat(Object.getOwnPropertyNames( Object.getPrototypeOf(fts2) ))
                .concat(Object.getOwnPropertyNames( fts2 ));
        });



        it(":", function() {

            let missing = EXPECTED_PROTO.filter( (property: string) => ( ! ACTUAL_PROTO.includes(property)) );

            missing = missing.filter( (property) => ( ! property.startsWith("_") ));
            if ( ! deepEqual(missing, [])) {
                fail(`Detected missing properties in module interface:\n - ${missing.join("\n - ")}`);
            }
        });


        it(":", function() {

            let unknown = ACTUAL_PROTO.filter( (property: string) => ( ! EXPECTED_PROTO.includes(property)) );

            unknown = unknown.filter( (property) => ( ! property.startsWith("_") ));
            if ( ! deepEqual(unknown, [])) {
                fail(`Detected new unknown (probably not tested) properties in module interface:\n - ${unknown.join("\n - ")}`);
            }
        });
    });

});
