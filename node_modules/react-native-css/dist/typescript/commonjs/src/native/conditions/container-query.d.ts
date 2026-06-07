import type { ContainerQuery } from "react-native-css/compiler";
import { type ContainerContextValue, type Getter } from "../reactivity";
import type { RenderGuard } from "./guards";
export declare const DEFAULT_CONTAINER_NAME = "c:___default___";
export declare function testContainerQueries(queries: ContainerQuery[], inheritedContainers: ContainerContextValue, guards: RenderGuard[], get: Getter): boolean;
export declare function testContainerQuery(query: ContainerQuery, inheritedContainers: ContainerContextValue, guards: RenderGuard[], get: Getter): boolean;
//# sourceMappingURL=container-query.d.ts.map