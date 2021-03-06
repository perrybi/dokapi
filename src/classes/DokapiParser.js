'use strict';

const fs = require('fs-extra');
const path = require('path');
const DokapiBook = require('./DokapiBook');
const Utils = require('./Utils');

class DokapiParser {

  /**
   * Checks that the book.json file is correct.
   * Checks that all referenced files exist.
   *
   * @param {string} inputDirectory
   * @return {DokapiBook} the parsed book
   */
  static parse(inputDirectory) {
    Utils.check.dir('input', inputDirectory);
    const configPath = path.resolve(inputDirectory, DokapiBook.CONFIG_FILE);
    inputDirectory = path.resolve(inputDirectory);

    let fileContent;
    try {
      fileContent = fs.readFileSync(configPath, {encoding: 'utf8'});
    } catch(e) {
      throw new Error(`Could not read file "${configPath}: ${e.message}`);
    }

    let bookContent;
    try {
      bookContent = JSON.parse(fileContent);
    } catch(e) {
      throw new Error(`Could not parse JSON content of "${configPath}": ${e.message}`);
    }

    const referencedContent = DokapiParser._validate(inputDirectory, bookContent);

    return new DokapiBook(inputDirectory, bookContent, referencedContent);
  }

  /**
   * @param {string} rootPath The main directory
   * @param {object} book
   * @return {Array<string>} all referenced files
   * @private
   */
  static _validate(rootPath, book) {
    const referencedFiles = [];

    // check that the .book.json file format is connect
    // check that all files referenced in "content" do exist in `dir`
    const checkFilePath = (key, value) => {
      Utils.check.regexp(key, value, /^[a-z0-9/-]+\.md$/);
      let filePath = path.resolve(rootPath, DokapiBook.CONTENT_DIR, value);
      referencedFiles.push(filePath);
    };
    Utils.check.properties('book', book, {
      name: {required: true, type: 'string'},
      project: {required: false, check: 'nonEmpty'},
      skipProjectVariables: {required: false, type: 'boolean'},
      main: {
        required: true,
        properties: {
          content: {required: true, check: checkFilePath},
          name: {required: false, check: 'nonEmpty'}
        }
      },
      variables: {required: true, type: 'object'},
      siteTemplate: {required: true, check: ['file', rootPath]},
      pageTemplate: {required: true, check: ['file', rootPath]},
      numbering: {required: false, type: 'boolean'},
      previousLink: {required: false, check: 'nonEmpty'},
      nextLink: {required: false, check: 'nonEmpty'},
      externalLinksToBlank: {required: false, type: 'boolean'},
      assets: {required: true, check: ['dir', rootPath]},
      index: {
        required: true,
        arrayItem: {
          properties: {
            name: {required: true, type: 'string'},
            key: {required: false, type: 'string'},
            hidden: {required: false, type: 'boolean'},
            content: {requiredUnless: 'children', check: checkFilePath},
            children: {required: false, arrayItem: {
              properties: {
                name: {required: true, type: 'string'},
                key: {required: false, type: 'string'},
                content: {required: true, check: checkFilePath}
              }
            }}
          }
        }
      }
    });

    return referencedFiles;
  }

}

module.exports = DokapiParser;
