const { rm, writeFile } = require('fs/promises');
const path = require("path");

(async () => {
    // Remove no-styles from src/lib
    await rm(path.join(__dirname, '/lib/no-styles/'), { recursive: true }).catch(() => {});

    // Generate package.json for the package folder
    const rootPkg = require('../package.json');
    const packagePkg = {
        name: rootPkg.name,
        version: rootPkg.version,
        description: rootPkg.description,
        repository: rootPkg.repository,
        author: rootPkg.author,
        license: rootPkg.license,
        keywords: rootPkg.keywords,
        type: rootPkg.type,
        svelte: "./index.js",
        types: "./index.d.ts",
        exports: {
            ".": {
                svelte: "./index.js",
                types: "./index.d.ts"
            },
            "./no-styles": {
                svelte: "./no-styles/index.js",
                types: "./no-styles/index.d.ts"
            }
        },
        peerDependencies: rootPkg.peerDependencies,
        dependencies: rootPkg.dependencies
    };

    await writeFile(
        path.join(__dirname, '../package/package.json'),
        JSON.stringify(packagePkg, null, 2)
    );

    console.log('Generated package/package.json');
})();
