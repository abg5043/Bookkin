import type { LibraryAdapter } from "../../application/libraries/library-adapter";
import {
  JOHNSON_COUNTY_LIBRARY_ID,
  johnsonCountyLibraryAdapter,
} from "./johnson-county-library";

const adapters: ReadonlyMap<string, LibraryAdapter> = new Map([
  [JOHNSON_COUNTY_LIBRARY_ID, johnsonCountyLibraryAdapter],
]);

export function resolveLibraryAdapter(adapterId: string): LibraryAdapter | null {
  return adapters.get(adapterId) ?? null;
}
