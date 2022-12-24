'use strict';

/**
 * Fixted: A simple way to populate a test database for Sails.js v1.
 * @module Fixted
 */
/**
 * A function to call once work is finished.
 * @callback doneCb
 * @returns void
 */

/**
 * Dependencies
 */
const fs = require('fs');
const path = require('path');
const async = require('async');
const _ = require('lodash');

class Fixted {
    // Fixture objects loaded from the JSON files
    data = {};

    // Map fixture positions in JSON files to the real DB IDs
    idMap = {};

    // The list of associations by model
    associations = {};

    // The list of the fixtures model names
    modelNames = [];

    /**
     * Load data fixtures into memory.
     * @param {string} [sourceFolder=/test/fixtures]
     * @returns this
     */
    constructor(sourceFolder) {
        // Load the fixtures
        sourceFolder = sourceFolder || process.cwd() + '/test/fixtures';
        const files = fs.readdirSync(sourceFolder);

        for (let i = 0; i < files.length; i++) {
            if (['.json', '.js'].indexOf(path.extname(files[i]).toLowerCase()) !== -1) {
                const modelName = path.basename(files[i]).split('.')[0].toLowerCase();

                this.data[modelName] = require(path.join(sourceFolder, files[i]));
            }
        }

        this.modelNames = Object.keys(this.data);

        return this;
    }

    /**
     * Build associations for the loaded data fixtures.
     * @param {string[]|doneCb} collections - Array of model names, or a callback function.
     * @param {doneCb} [done] - A callback function.
     * @returns void
     */
    associate(collections, done) {
        if (!Array.isArray(collections)) {
            done = collections;
            collections = this.modelNames;
        }

        // Add associations whenever needed
        async.each(collections, (modelName, nextModel) => {
            const thisModel = sails.models[modelName];

            if (thisModel) {
                const fixtureObjects = _.cloneDeep(this.data[modelName]);

                async.each(fixtureObjects, (item, nextItem) => {
                    // Item position in the file
                    const itemIndex = fixtureObjects.indexOf(item);

                    // Find and associate
                    thisModel.findOne(this.idMap[modelName][itemIndex]).exec((err, model) => {
                        if (err) {
                            return nextItem(err);
                        }

                        if (!model) {
                            return nextItem(new Error('Could not find the model'));
                        }

                        let shouldUpdate = false;

                        // Pick associations only
                        item = _.pick(item, Object.keys(this.associations[modelName]));

                        _.forEach(item, (val, attr) => {
                            const association = this.associations[modelName][attr];
                            const joined = association[association.type];

                            // Required associations should have been added by .populate()
                            if (association.required) {
                                return;
                            }

                            shouldUpdate = true;

                            if (!Array.isArray(item[attr])) {
                                model[attr] = this.idMap[joined][item[attr] - 1];
                            } else {
                                model[attr] = [];

                                for (let j = 0; j < item[attr].length; ++j) {
                                    model[attr].push(this.idMap[joined][item[attr][j] - 1]);
                                }
                            }
                        });

                        if (shouldUpdate) {
                            model = JSON.parse(JSON.stringify(model)); // force model to a plain object, or Waterline will not be happy
                            thisModel.updateOne(this.idMap[modelName][itemIndex]).set(model).exec((err) => {
                                if (err) {
                                    return nextItem(err);
                                }

                                return nextItem();
                            });
                        } else {
                            return nextItem();
                        }
                    });
                }, nextModel);
            } else {
                nextModel();
            }
        }, done);
    }

    /**
     * Populate the database with the loaded data fixtures.
     * @param {string[]|doneCb} collections - An array of model names to populate, in order.
     * @param {boolean|doneCb} [done] - A callback function.
     * @param {boolean} [autoAssociations] - Set to `false` to disable auto associations.
     * @returns void
     */
    populate(collections, done, autoAssociations) {
        let preserveLoadOrder = true;

        if (!Array.isArray(collections)) {
            autoAssociations = done;
            done = collections;
            collections = this.modelNames;
            preserveLoadOrder = false;
        } else {
            _.forEach(collections, (collection, key) => {
                collections[key] = collection.toLowerCase();
            });
        }

        autoAssociations = !(autoAssociations === false); // auto associations are turned on, unless explicitly turned off

        // Populate each table / collection
        async[preserveLoadOrder ? 'eachSeries' : 'each'](collections, (modelName, nextModel) => {
            let thisModel = sails.models[modelName];

            if (thisModel) {
                // Cleanup existing data in the table / collection
                thisModel.destroy({}).exec((err) => {
                    if (err) {
                        return nextModel(err);
                    }

                    // Save model's association information
                    this.associations[modelName] = {};
                    for (let i = 0; i < thisModel.associations.length; ++i) {
                        const alias = thisModel.associations[i].alias;

                        this.associations[modelName][alias] = thisModel.associations[i];
                        this.associations[modelName][alias].required = thisModel.attributes[alias].required;
                    }

                    // Insert all the fixture items
                    this.idMap[modelName] = [];
                    const fixtureObjects = _.cloneDeep(this.data[modelName]);

                    async.eachSeries(fixtureObjects, (item, nextItem) => {
                        // Item position in the file
                        const itemIndex = fixtureObjects.indexOf(item);

                        for (const alias in this.associations[modelName]) {
                            if (Object.prototype.hasOwnProperty.call(this.associations[modelName], alias)) {
                                if (this.associations[modelName][alias].required) {
                                    // With required associations present, the associated fixtures
                                    // must be already loaded, so we can map the ids
                                    const collectionName = this.associations[modelName][alias].collection; // many-to-many
                                    const associatedModelName = this.associations[modelName][alias].model; // one-to-many

                                    if (Array.isArray(item[alias]) && collectionName) {
                                        if (!this.idMap[collectionName]) {
                                            return nextItem(
                                                new Error('Please provide a loading order acceptable for required associations')
                                            );
                                        }

                                        for (let i = 0; i < item[alias].length; i++) {
                                            item[alias][i] = this.idMap[collectionName][item[alias][i] - 1];
                                        }
                                    } else if (associatedModelName) {
                                        if (!this.idMap[associatedModelName]) {
                                            return nextItem(
                                                new Error('Please provide a loading order acceptable for required associations')
                                            );
                                        }

                                        item[alias] = this.idMap[associatedModelName][item[alias] - 1];
                                    }
                                } else if (autoAssociations) {
                                    // The order is not important, so we can strip
                                    // associations data and associate later
                                    item = _.omit(item, alias);
                                }
                            }
                        }

                        // Insert
                        thisModel.create(item).meta({fetch: true}).exec((err, model) => {
                            if (err) {
                                return nextItem(err);
                            }

                            // Primary key mapping
                            this.idMap[modelName][itemIndex] = model[thisModel.primaryKey];

                            nextItem();
                        });
                    }, nextModel);
                });
            } else {
                nextModel();
            }
        }, (err) => {
            if (err) {
                return done(err);
            }

            // Create associations if requested
            if (autoAssociations) {
                return this.associate(collections, done);
            }

            done();
        });
    }
}

module.exports = Fixted;
