const cssjson = require('cssjson');
const CURR_DIR = process.cwd();
const fs = require('fs');
const colors = require('colors');
const cssDiff = require('commander');
const _isEqual = require('lodash/isEqual');

function readFile(fileDir) {
    return fs.readFileSync(fileDir, 'utf-8');
}

function stripTrailingSpaces(string) {
    return string.trim();
}

function getMapFromJsonObject(json) {
    const styles = json.children;

    return Object.keys(styles).reduce((cssMap, cssKey) => {
        const allStyles = cssKey.split(',');

        allStyles.forEach(style => {
            cssMap.set(stripTrailingSpaces(style), styles[cssKey]);
        });

        return cssMap;
    }, new Map());
}

function getFilePath(path) {
    const equals = fs.existsSync(path);

    if(equals) { return path; }

    if(path.substring(path.length - 4, path.length) !== '.css') {
        return getFilePath(`${path}.css`);
    }

    if(path.substring(0, 1) !== '/') {
        return getFilePath(`${CURR_DIR}/${path}`);
    }

    throw new Error(`Could not construct file path to CSS file (${path}). Check params and try again.`);
}

try {
    cssDiff
        .arguments('<filename/filepath> <filename/filepath>')
        .action((fileOne, fileTwo) => {
            console.log('\nReading files... [1/5]'.cyan);

            const filePathOne = getFilePath(fileOne);
            const filePathTwo = getFilePath(fileTwo);

            const cssOne = cssjson.toJSON(readFile(filePathOne));
            const cssTwo = cssjson.toJSON(readFile(filePathTwo));

            if (!cssOne.children || !cssTwo.children) {
                console.log('CSS files were not in a readable format.'.red);
                process.exit();
            }

            if (_isEqual(cssOne, cssTwo)) {
                console.log('CSS files match and are equal ✓'.green);
            }

            console.log('Building CSS maps... [2/5]'.cyan);

            const cssOneMap = getMapFromJsonObject(cssOne);
            const cssTwoMap = getMapFromJsonObject(cssTwo);
            const missingInCSSOne = [], missingInCSSTwo = [], different = [];

            console.log('Comparing file one to file two... [3/5]'.cyan);

            Array.from(cssOneMap.entries()).forEach(([key]) => {
                if (!cssTwoMap.has(key)) {
                    return missingInCSSTwo.push(key);
                }

                if (!_isEqual(cssOneMap.get(key), cssTwoMap.get(key))) {
                    different.push(key);
                }
            });

            console.log('Comparing file two to file one... [4/5]'.cyan);

            Array.from(cssTwoMap.entries()).forEach(([key]) => {
                if (!cssOneMap.has(key)) {
                    missingInCSSOne.push(key);
                }
            });

            console.log('Building report... [5/5]'.cyan);

            if (missingInCSSTwo.length > 0) {
                console.log('\n----------------------------------------------'.red);
                console.log(`Styles in file 1 that were not in file 2 (${missingInCSSTwo.length})`.red);
                console.log('----------------------------------------------'.red);
                missingInCSSTwo.forEach(style => {
                    console.log(`\n${style}`.red);
                });
            }

            if (missingInCSSOne.length > 0) {
                console.log('\n----------------------------------------------'.red);
                console.log(`Styles in file 2 that were not in file 1 (${missingInCSSOne.length})`.red);
                console.log('----------------------------------------------'.red);

                missingInCSSOne.forEach(style => {
                    console.log(`\n${style}`.red);
                });
            }

            if (different.length > 0) {
                console.log('\n------------------------------------------------------------'.yellow);
                console.log(`Styles present in both CSS files that were different (${different.length})`.yellow);
                console.log('------------------------------------------------------------'.yellow);

                different.forEach(style => {
                    console.log(`\n${style}`.yellow);
                });
            }

            console.log('\nFinished generating CSS report.\n'.green);

            process.exit();
        })
        .parse(process.argv);

    console.log('\nNo arguments provided. Need to provide two CSS file references.\n'.red);

} catch (e) {
    console.log(`\nThere was a problem generating the report. (${e}).\n`.red);
    process.exit();
}