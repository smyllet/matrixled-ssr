import type { HookResult } from "@nuxt/schema";
import type { Route } from "@tuyau/core/types";

type MatrixDto = Route.Response<"matrices.store">["data"];

declare module "#app" {
  interface RuntimeNuxtHooks {
    "app:matrix:created": (matrix: MatrixDto) => HookResult<>;
    "app:matrix:updated": (matrix: MatrixDto) => HookResult<>;
    "app:matrix:deleted": (matrixId: MatrixDto["id"]) => HookResult<>;
  }
}
