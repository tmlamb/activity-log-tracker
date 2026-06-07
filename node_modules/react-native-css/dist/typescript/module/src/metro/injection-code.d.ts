/**
 * This is a hack around Metro's handling of bundles.
 * When a component is inside a lazy() barrier, it is inside a different JS bundle.
 * So when it updates, it only updates its local bundle, not the global one which contains the CSS files.
 *
 * This means that the CSS file will not be re-evaluated when a component in a different bundle updates,
 * breaking tools like Tailwind CSS
 *
 * To fix this, we force our code to always import the CSS files, so now the CSS files are in every bundle.
 */
export declare function getWebInjectionCode(filePaths: string[]): Buffer<ArrayBuffer>;
export declare function getNativeInjectionCode(cssFilePaths: string[], values: unknown[]): Buffer<ArrayBuffer>;
//# sourceMappingURL=injection-code.d.ts.map