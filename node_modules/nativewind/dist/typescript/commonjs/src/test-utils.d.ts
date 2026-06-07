import type { PropsWithChildren, ReactElement } from "react";
import { render as tlRender, type RenderOptions } from "@testing-library/react-native";
import type { compile } from "react-native-css/compiler";
export type NativewindRenderOptions = RenderOptions & {
    /** Replace the generated CSS*/
    css?: string;
    /** Appended after the generated CSS */
    extraCss?: string;
    /** Specify the className to use for the component @default sourceInline */
    className?: string;
    /** Add `@source inline('<className>')` to the CSS. @default Values are extracted from the component's className */
    sourceInline?: string[];
    /** Whether to include the theme in the generated CSS @default true */
    theme?: boolean;
    /** Whether to include the preflight in the generated CSS @default false */
    preflight?: boolean;
    /** Whether to include the plugin in the generated CSS. @default true */
    plugin?: boolean;
    /** Enable debug logging. @default false - Set process.env.NATIVEWIND_TEST_AUTO_DEBUG and run tests with the node inspector   */
    debug?: boolean | "verbose";
};
export declare function render(component: ReactElement<PropsWithChildren>, { css, sourceInline, debug, theme, preflight, plugin, extraCss, ...options }?: NativewindRenderOptions): Promise<ReturnType<typeof tlRender> & ReturnType<typeof compile>>;
export declare namespace render {
    var debug: (component: ReactElement<PropsWithChildren>, options?: RenderOptions) => Promise<{
        rerender: (component: React.ReactElement) => void;
        rerenderAsync: (component: React.ReactElement) => Promise<void>;
        update: (component: React.ReactElement) => void;
        updateAsync: (component: React.ReactElement) => Promise<void>;
        unmount: () => void;
        unmountAsync: () => Promise<void>;
        toJSON: () => null | import("react-test-renderer").ReactTestRendererJSON | import("react-test-renderer").ReactTestRendererJSON[];
        debug: import("@testing-library/react-native").DebugFunction;
        root: import("react-test-renderer").ReactTestInstance;
        UNSAFE_root: import("react-test-renderer").ReactTestInstance;
        UNSAFE_getByProps: (props: {
            [x: string]: unknown;
        }) => import("react-test-renderer").ReactTestInstance;
        UNSAFE_getAllByProps: (props: {
            [x: string]: unknown;
        }) => Array<import("react-test-renderer").ReactTestInstance>;
        UNSAFE_queryByProps: (props: {
            [x: string]: unknown;
        }) => import("react-test-renderer").ReactTestInstance | null;
        UNSAFE_queryAllByProps: (props: {
            [x: string]: unknown;
        }) => Array<import("react-test-renderer").ReactTestInstance>;
        UNSAFE_getByType: <P>(type: React.ComponentType<P>) => import("react-test-renderer").ReactTestInstance;
        UNSAFE_getAllByType: <P>(type: React.ComponentType<P>) => Array<import("react-test-renderer").ReactTestInstance>;
        UNSAFE_queryByType: <P>(type: React.ComponentType<P>) => import("react-test-renderer").ReactTestInstance | null;
        UNSAFE_queryAllByType: <P>(type: React.ComponentType<P>) => Array<import("react-test-renderer").ReactTestInstance>;
        getByRole: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/queries/role").ByRoleMatcher, import("@testing-library/react-native/build/queries/role").ByRoleOptions>;
        getAllByRole: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/queries/role").ByRoleMatcher, import("@testing-library/react-native/build/queries/role").ByRoleOptions>;
        queryByRole: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/queries/role").ByRoleMatcher, import("@testing-library/react-native/build/queries/role").ByRoleOptions>;
        queryAllByRole: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/queries/role").ByRoleMatcher, import("@testing-library/react-native/build/queries/role").ByRoleOptions>;
        findByRole: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/queries/role").ByRoleMatcher, import("@testing-library/react-native/build/queries/role").ByRoleOptions>;
        findAllByRole: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/queries/role").ByRoleMatcher, import("@testing-library/react-native/build/queries/role").ByRoleOptions>;
        getByHintText: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByHintText: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByHintText: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByHintText: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByHintText: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByHintText: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByA11yHint: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByA11yHint: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByA11yHint: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByA11yHint: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByA11yHint: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByA11yHint: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByAccessibilityHint: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByAccessibilityHint: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByAccessibilityHint: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByAccessibilityHint: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByAccessibilityHint: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByAccessibilityHint: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByLabelText: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByLabelText: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByLabelText: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByLabelText: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByLabelText: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByLabelText: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByPlaceholderText: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByPlaceholderText: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByPlaceholderText: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByPlaceholderText: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByPlaceholderText: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByPlaceholderText: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByDisplayValue: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByDisplayValue: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByDisplayValue: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByDisplayValue: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByDisplayValue: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByDisplayValue: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByTestId: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByTestId: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByTestId: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByTestId: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByTestId: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByTestId: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getByText: import("@testing-library/react-native/build/queries/make-queries").GetByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        getAllByText: import("@testing-library/react-native/build/queries/make-queries").GetAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryByText: import("@testing-library/react-native/build/queries/make-queries").QueryByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        queryAllByText: import("@testing-library/react-native/build/queries/make-queries").QueryAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findByText: import("@testing-library/react-native/build/queries/make-queries").FindByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
        findAllByText: import("@testing-library/react-native/build/queries/make-queries").FindAllByQuery<import("@testing-library/react-native/build/matches").TextMatch, import("@testing-library/react-native/build/queries/options").CommonQueryOptions & import("@testing-library/react-native/build/matches").TextMatchOptions>;
    } & {
        stylesheet: () => import("react-native-css/compiler").ReactNativeCssStyleSheet;
        warnings: () => {
            properties?: string[];
            values?: Record<string, unknown[]>;
            functions?: string[];
        };
    }>;
}
export declare function renderSimple({ className, ...options }: NativewindRenderOptions & {
    className: string;
}): Promise<{
    props: {
        [propName: string]: any;
    };
    warnings: Record<string, unknown>;
} | {
    props: {
        [propName: string]: any;
    };
    warnings?: undefined;
}>;
export declare namespace renderSimple {
    var debug: (options: NativewindRenderOptions & {
        className: string;
    }) => Promise<{
        props: {
            [propName: string]: any;
        };
        warnings: Record<string, unknown>;
    } | {
        props: {
            [propName: string]: any;
        };
        warnings?: undefined;
    }>;
}
/**
 * Helper method that uses the current test name to render the component
 * Doesn't not support multiple components or changing the component type
 */
export declare function renderCurrentTest({ className, ...options }?: NativewindRenderOptions): Promise<{
    props: {
        [propName: string]: any;
    };
    warnings: Record<string, unknown>;
} | {
    props: {
        [propName: string]: any;
    };
    warnings?: undefined;
}>;
export declare namespace renderCurrentTest {
    var debug: (options?: NativewindRenderOptions) => Promise<{
        props: {
            [propName: string]: any;
        };
        warnings: Record<string, unknown>;
    } | {
        props: {
            [propName: string]: any;
        };
        warnings?: undefined;
    }>;
}
//# sourceMappingURL=test-utils.d.ts.map