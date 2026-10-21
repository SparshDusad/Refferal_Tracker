import { describe, expect, it } from "vitest";
import { APPLICATION_STAGES, STAGE_LABELS } from "./types";
describe("application stages",()=>{
 it("has a label for each allowed stage",()=>{expect(Object.keys(STAGE_LABELS).sort()).toEqual([...APPLICATION_STAGES].sort());});
 it("uses stable lowercase identifiers",()=>{for(const stage of APPLICATION_STAGES){expect(stage).toMatch(/^[a-z_]+$/);expect(STAGE_LABELS[stage].length).toBeGreaterThan(0);}});
});
